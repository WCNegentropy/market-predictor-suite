import { walkForward } from '../backtest/walkForward.js';
import { fetchBars } from '../data/sources.js';
import { buildDataset } from '../features/indicators.js';
import { buildPolicySnapshot } from '../models/policy.js';
import { buildRiskSnapshot } from '../models/risk.js';
import { appendJsonl, applySelfTrainingAdjustment, buildFeedbackLedgerRecords, buildPredictionLedgerRecord, parseJsonl, summarizeFeedbackRecords } from '../models/selfTraining.js';
import { buildTournamentLiveOverlay, runTournament } from '../models/tournament.js';
import { clampProbability, predictEnsemble } from '../models/ensemble.js';
import { createModel, trainEpoch } from '../models/onlineLogistic.js';
import { nowIso } from '../utils/fs.js';
import { DEFAULT_HORIZONS, horizonLabel } from '../utils/regime.js';
import { loadState, saveState, statePaths } from './state.js';

function logLoss(probability, actual) {
  const p = clampProbability(probability);
  return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
}

function computeSummary(predictions, evaluations) {
  const scored = evaluations.length;
  const accuracy = scored ? evaluations.filter(item => item.correct).length / scored : 0;
  const avgBrier = scored ? evaluations.reduce((sum, item) => sum + item.brier, 0) / scored : 0;
  const avgLogLoss = scored ? evaluations.reduce((sum, item) => sum + item.logLoss, 0) / scored : 0;
  const pending = predictions.reduce((sum, prediction) => sum + Object.values(prediction.horizons || {}).filter(item => !item.scoredAt).length, 0);
  return { totalScored: scored, accuracy, avgBrier, avgLogLoss, pending };
}

function withSummary(state) {
  state.metrics.summary = computeSummary(state.predictions, state.metrics.evaluations);
  return state;
}

function horizonRows(state, label, targetType = 'direction') {
  const rows = state.features.trainingRowsByHorizon?.[label] ?? [];
  if (targetType === 'direction') return rows;
  return rows.map(row => ({
    ...row,
    target: targetType === 'pump' ? row.isPump : row.isCrash
  }));
}

function refreshFeedbackState(paths, state) {
  const feedbackRecords = parseJsonl(paths.feedbackLedger);
  const predictionLedger = parseJsonl(paths.predictionLedger);
  state.feedback = {
    ...summarizeFeedbackRecords(feedbackRecords),
    predictionLedgerCount: predictionLedger.length,
    feedbackLedgerCount: feedbackRecords.length
  };
  return state.feedback;
}

export async function fetchOnly(opts) {
  const paths = statePaths(opts.stateDir, opts.asset, opts.symbol);
  const state = loadState(paths);
  const fetched = await fetchBars(opts);
  state.bars = fetched.bars;
  state.features = { 
    ...buildDataset(fetched.bars, DEFAULT_HORIZONS, opts.interval), 
    provider: fetched.provider, 
    updatedAt: nowIso() 
  };
  refreshFeedbackState(paths, state);
  saveState(paths, withSummary(state));
  return { paths, state };
}

export async function trainOnly(opts, existing = null) {
  const prepared = existing ?? await fetchOnly(opts);
  const { paths, state } = prepared;
  refreshFeedbackState(paths, state);
  const models = {};
  const qualityByHorizon = {};
  const tournamentsByHorizon = {};
  for (const h of DEFAULT_HORIZONS) {
    const label = horizonLabel(h);
    const rows = horizonRows(state, label, opts.targetType);
    if (!rows.length) continue;
    const previous = state.model?.horizons?.[label] ?? {};
    const model = createModel(previous);
    trainEpoch(model, rows, 4);
    const quality = walkForward(rows);
    model.componentWeights = quality.latestComponentWeights;
    model.calibrator = quality.latestCalibrator;
    model.quality = {
      accuracy: quality.accuracy,
      brier: quality.brier,
      logLoss: quality.logLoss,
      observations: quality.results.length,
      regimeStats: quality.regimeStats
    };
    model.feedback = state.feedback.byHorizon?.[label] ?? { observations: 0, accuracy: 0, avgBrier: 0, avgLogLoss: 0, avgResidual: 0, avgEdge: 0 };
    model.lastTrainedAt = nowIso();
    models[label] = model;
    qualityByHorizon[label] = model.quality;
    tournamentsByHorizon[label] = runTournament(rows);
  }
  state.model = {
    version: 3,
    horizons: models,
    tournaments: tournamentsByHorizon,
    feedback: state.feedback,
    selfTraining: {
      enabled: true,
      feedbackSchema: 'mps.feedback.v1',
      recentObservations: state.feedback.recentObservations,
      updatedAt: state.feedback.updatedAt
    },
    latestRegime: state.features.latestFeature?.regime ?? null,
    lastTrainedAt: nowIso()
  };
  saveState(paths, withSummary(state));
  return { paths, state, model: state.model, qualityByHorizon, tournamentsByHorizon, feedbackSummary: state.feedback };
}

export async function tournamentPredictOnly(opts, prepared = null) {
  const trained = prepared ?? await trainOnly(opts);
  const { paths, state, model } = trained;
  refreshFeedbackState(paths, state);
  const latestFeature = state.features.latestFeature;
  if (!latestFeature) throw new Error('Not enough history to generate a live tournament feature row');
  const horizons = {};
  for (const h of DEFAULT_HORIZONS) {
    const label = horizonLabel(h);
    const horizonModel = model.horizons?.[label];
    if (!horizonModel) continue;
    const overlay = buildTournamentLiveOverlay(horizonModel, latestFeature.features, model.tournaments?.[label], latestFeature.regime);
    const adjusted = applySelfTrainingAdjustment(overlay.metaProbabilityUp, state.feedback, label, latestFeature.regime);
    overlay.baseMetaProbabilityUp = overlay.metaProbabilityUp;
    overlay.metaProbabilityUp = adjusted.probabilityUp;
    overlay.feedbackAdjustedMetaProbabilityUp = adjusted.probabilityUp;
    overlay.feedbackAdjustment = adjusted.adjustment;
    overlay.metaDirection = overlay.metaProbabilityUp >= 0.5 ? 'up' : 'down';
    horizons[label] = overlay;
  }
  return {
    latestRegime: latestFeature.regime,
    baseTimestamp: latestFeature.timestamp,
    referenceClose: latestFeature.close,
    provider: state.features.provider,
    feedbackSummary: state.feedback,
    horizons
  };
}

export async function policyOnly(opts, config = {}, prepared = null) {
  const overlay = await tournamentPredictOnly(opts, prepared);
  return buildPolicySnapshot(overlay, config);
}

export async function riskOnly(opts, policyConfig = {}, riskConfig = {}, prepared = null) {
  const policy = await policyOnly(opts, policyConfig, prepared);
  return buildRiskSnapshot(policy, riskConfig);
}

export async function predictOnly(opts, prepared = null) {
  const trained = prepared ?? await trainOnly(opts);
  const { paths, state, model } = trained;
  refreshFeedbackState(paths, state);
  const latestFeature = state.features.latestFeature;
  if (!latestFeature) throw new Error('Not enough history to generate a live prediction feature row');
  const predictionId = `${opts.asset}:${opts.symbol.toUpperCase()}:${latestFeature.timestamp}:${Date.now()}`;
  const horizons = {};
  for (const h of DEFAULT_HORIZONS) {
    const label = horizonLabel(h);
    const horizonModel = model.horizons?.[label];
    if (!horizonModel) continue;
    const ensemble = predictEnsemble(horizonModel, latestFeature.features, horizonModel.componentWeights, horizonModel.calibrator);
    const adjusted = applySelfTrainingAdjustment(ensemble.probabilityUp, state.feedback, label, latestFeature.regime);
    horizons[label] = {
      horizonPeriods: h,
      probabilityUp: adjusted.probabilityUp,
      baseProbabilityUp: ensemble.probabilityUp,
      feedbackAdjustedProbabilityUp: adjusted.probabilityUp,
      rawProbabilityUp: ensemble.rawProbabilityUp,
      probabilityDown: 1 - adjusted.probabilityUp,
      direction: adjusted.probabilityUp >= 0.5 ? 'up' : 'down',
      isPump: latestFeature.isPump ?? 0,
      isCrash: latestFeature.isCrash ?? 0,
      move: latestFeature.move ?? 0,
      components: {
        logisticProbability: ensemble.logisticProbability,
        heuristicProbability: ensemble.heuristicProbability
      },
      componentWeights: ensemble.componentWeights,
      calibrator: ensemble.calibrator,
      feedbackAdjustment: adjusted.adjustment
    };
  }
  const prediction = {
    predictionId,
    createdAt: nowIso(),
    baseTimestamp: latestFeature.timestamp,
    nextPeriod: `multi_horizon_${opts.interval}_close`,
    referenceClose: latestFeature.close,
    provider: state.features.provider,
    regime: latestFeature.regime,
    feedbackSummarySnapshot: {
      recentObservations: state.feedback.recentObservations,
      horizons: Object.fromEntries(Object.entries(state.feedback.byHorizon || {}).map(([k, v]) => [k, { observations: v.observations, accuracy: v.accuracy, avgBrier: v.avgBrier }]))
    },
    horizons
  };
  state.predictions.push(prediction);
  appendJsonl(paths.predictionLedger, [buildPredictionLedgerRecord(prediction, opts.asset, opts.symbol)]);
  refreshFeedbackState(paths, state);
  saveState(paths, withSummary(state));
  return { paths, state, prediction };
}

export async function evaluateOnly(opts, existing = null) {
  const prepared = existing ?? await fetchOnly(opts);
  const { paths, state } = prepared;
  const bars = [...state.bars].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const byTimestamp = new Map(bars.map((bar, index) => [bar.timestamp, index]));
  const evaluated = [];
  const feedbackRows = [];
  for (const prediction of state.predictions) {
    const baseIndex = byTimestamp.get(prediction.baseTimestamp);
    if (baseIndex === undefined) continue;
    for (const [label, horizonPrediction] of Object.entries(prediction.horizons || {})) {
      if (horizonPrediction.scoredAt) continue;
      const h = horizonPrediction.horizonPeriods ?? horizonPrediction.horizonDays;
      const targetIndex = baseIndex + h;
      const futureBar = bars[targetIndex];
      if (!futureBar) continue;
      
      const actualMove = (futureBar.close - prediction.referenceClose) / prediction.referenceClose;
      const actual = actualMove > 0 ? 1 : 0;
      const actualDirection = actual === 1 ? 'up' : 'down';
      
      // Determine actual pump/crash based on same adaptive logic or simple threshold for now
      // Re-calculating adaptive vol here would be slow, using a simple heuristic or storing it
      // For evaluation, we just use the direction primarily, but we can capture the move.
      
      horizonPrediction.targetTimestamp = futureBar.timestamp;
      horizonPrediction.actualClose = futureBar.close;
      horizonPrediction.actualMove = actualMove;
      horizonPrediction.actualDirection = actualDirection;
      horizonPrediction.correct = horizonPrediction.direction === actualDirection;
      horizonPrediction.brier = (horizonPrediction.probabilityUp - actual) ** 2;
      horizonPrediction.logLoss = logLoss(horizonPrediction.probabilityUp, actual);
      horizonPrediction.scoredAt = nowIso();
      const metric = {
        scoredAt: horizonPrediction.scoredAt,
        baseTimestamp: prediction.baseTimestamp,
        targetTimestamp: futureBar.timestamp,
        horizon: label,
        regime: prediction.regime,
        correct: horizonPrediction.correct,
        predicted: horizonPrediction.direction,
        actual: actualDirection,
        brier: horizonPrediction.brier,
        logLoss: horizonPrediction.logLoss,
        provider: prediction.provider
      };
      state.metrics.evaluations.push(metric);
      evaluated.push(metric);
    }
    feedbackRows.push(...buildFeedbackLedgerRecords(prediction, opts.asset, opts.symbol));
  }
  appendJsonl(paths.feedbackLedger, feedbackRows.filter((row, index, array) => array.findIndex(other => other.predictionId === row.predictionId && other.horizon === row.horizon && other.scoredAt === row.scoredAt) === index));
  refreshFeedbackState(paths, state);
  saveState(paths, withSummary(state));
  return { paths, state, evaluated };
}

export async function runDaily(opts) {
  const fetched = await fetchOnly(opts);
  const evaluation = await evaluateOnly(opts, fetched);
  const trained = await trainOnly(opts, fetched);
  const backtests = {};
  for (const h of DEFAULT_HORIZONS) {
    const label = horizonLabel(h);
    const quality = trained.qualityByHorizon[label];
    if (!quality) continue;
    backtests[label] = quality;
    trained.state.metrics.backtests.push({
      createdAt: nowIso(),
      horizon: label,
      accuracy: quality.accuracy,
      brier: quality.brier,
      logLoss: quality.logLoss,
      observations: quality.observations,
      regimeStats: quality.regimeStats,
      provider: trained.state.features.provider
    });
  }
  saveState(trained.paths, withSummary(trained.state));
  const prediction = await predictOnly(opts, trained);
  return {
    paths: prediction.paths,
    state: prediction.state,
    evaluated: evaluation.evaluated,
    prediction: prediction.prediction,
    backtests,
    feedbackSummary: prediction.state.feedback
  };
}
