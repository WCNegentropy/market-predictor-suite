#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { DEFAULT_LOOKBACK, DEFAULT_STATE_DIR } from '../config/defaults.js';
import { evaluateOnly, fetchOnly, policyOnly, predictOnly, riskOnly, runDaily, tournamentPredictOnly, trainOnly } from '../pipeline/daily.js';
import { importFeedbackLedger, importPredictionLedger, replayFeedback } from '../pipeline/importReplay.js';
import { walkForward } from '../backtest/walkForward.js';
import { parseJsonl } from '../models/selfTraining.js';
import { loadState, statePaths } from '../pipeline/state.js';
import { withFileLock } from '../utils/lock.js';
import { doctorState, maintainState } from '../utils/stateMaintenance.js';

const program = new Command();

function applyCommon(cmd) {
  return cmd
    .requiredOption('--symbol <symbol>', 'Ticker or product symbol, e.g. AAPL or BTCUSD')
    .option('--asset <asset>', 'stocks or crypto', 'stocks')
    .option('--lookback <days>', 'Number of daily bars', value => Number(value), DEFAULT_LOOKBACK)
    .option('--state-dir <dir>', 'State directory', DEFAULT_STATE_DIR);
}

function applyPolicyOptions(cmd) {
  return applyCommon(cmd)
    .option('--min-edge <num>', 'Minimum edge from 0.5 required per horizon', value => Number(value), 0.06)
    .option('--min-horizon-confidence <num>', 'Minimum per-horizon confidence score', value => Number(value), 0.55)
    .option('--min-consensus-weight <num>', 'Minimum weighted consensus across horizons', value => Number(value), 0.66)
    .option('--min-aligned-horizons <num>', 'Minimum count of horizons aligned in one direction', value => Number(value), 2)
    .option('--max-consensus-spread <num>', 'Maximum allowed entrant disagreement spread per horizon', value => Number(value), 0.45)
    .option('--require-champion-agreement', 'Require global champion agreement for gated horizons', false)
    .option('--require-regime-champion-agreement', 'Require regime champion agreement for gated horizons', false);
}

function applyRiskOptions(cmd) {
  return applyPolicyOptions(cmd)
    .option('--max-risk-fraction <num>', 'Maximum account risk fraction for a signal', value => Number(value), 0.01)
    .option('--min-exposure <num>', 'Minimum normalized exposure when a trade is allowed', value => Number(value), 0.1)
    .option('--max-exposure <num>', 'Maximum normalized exposure when a trade is allowed', value => Number(value), 1)
    .option('--base-stop-pct <num>', 'Base stop loss percent from entry reference', value => Number(value), 0.025)
    .option('--base-take-profit-multiple <num>', 'Take-profit multiple of stop distance', value => Number(value), 1.8)
    .option('--trailing-stop-pct <num>', 'Trailing stop percent from entry reference', value => Number(value), 0.018)
    .option('--min-reward-to-risk <num>', 'Minimum acceptable reward-to-risk ratio', value => Number(value), 1.5)
    .option('--require-all-gated-aligned', 'Require every gated horizon to align with final direction', false)
    .option('--block-on-wide-consensus-spread', 'Block trades when average consensus spread is too wide', true)
    .option('--max-average-consensus-spread <num>', 'Maximum allowed average consensus spread', value => Number(value), 0.42);
}

function policyConfigFromOpts(opts) {
  return {
    minEdge: opts.minEdge,
    minHorizonConfidence: opts.minHorizonConfidence,
    minConsensusWeight: opts.minConsensusWeight,
    minAlignedHorizons: opts.minAlignedHorizons,
    maxConsensusSpread: opts.maxConsensusSpread,
    requireChampionAgreement: Boolean(opts.requireChampionAgreement),
    requireRegimeChampionAgreement: Boolean(opts.requireRegimeChampionAgreement)
  };
}

function riskConfigFromOpts(opts) {
  return {
    maxRiskFraction: opts.maxRiskFraction,
    minExposure: opts.minExposure,
    maxExposure: opts.maxExposure,
    baseStopPct: opts.baseStopPct,
    baseTakeProfitMultiple: opts.baseTakeProfitMultiple,
    trailingStopPct: opts.trailingStopPct,
    minRewardToRisk: opts.minRewardToRisk,
    requireAllGatedAligned: Boolean(opts.requireAllGatedAligned),
    blockOnWideConsensusSpread: opts.blockOnWideConsensusSpread !== false,
    maxAverageConsensusSpread: opts.maxAverageConsensusSpread
  };
}

program.name('mps').description('Local-first market prediction suite');

function lockPath(opts) {
  return path.join(opts.stateDir, opts.asset, opts.symbol.toUpperCase(), '.run.lock');
}

async function runWithTargetLock(opts, fn) {
  return await withFileLock(lockPath(opts), fn);
}

applyCommon(program.command('fetch').description('Fetch and store market data with provider fallbacks')).action(async opts => {
  const { state } = await runWithTargetLock(opts, () => fetchOnly(opts));
  console.log(JSON.stringify({
    provider: state.features.provider,
    bars: state.bars.length,
    horizons: state.features.horizons,
    trainingRowsByHorizon: Object.fromEntries(Object.entries(state.features.trainingRowsByHorizon || {}).map(([k, rows]) => [k, rows.length])),
    latestFeatureTimestamp: state.features.latestFeature?.timestamp ?? null,
    latestRegime: state.features.latestFeature?.regime ?? null,
    featureCount: Object.values(state.features.trainingRowsByHorizon || {})[0]?.[0] ? Object.keys(Object.values(state.features.trainingRowsByHorizon)[0][0].features).length : 0,
    feedbackSummary: state.feedback
  }, null, 2));
});

applyCommon(program.command('train').description('Fetch and train/update the calibrated multi-horizon ensemble with self-training feedback')).action(async opts => {
  const { model, state, qualityByHorizon, feedbackSummary } = await runWithTargetLock(opts, () => trainOnly(opts));
  console.log(JSON.stringify({
    provider: state.features.provider,
    latestRegime: model.latestRegime,
    horizons: Object.keys(model.horizons || {}),
    qualityByHorizon,
    feedbackSummary,
    models: Object.fromEntries(Object.entries(model.horizons || {}).map(([k, v]) => [k, {
      componentWeights: v.componentWeights,
      calibrator: v.calibrator,
      trainingExamples: v.trainingExamples,
      feedback: v.feedback
    }]))
  }, null, 2));
});

applyCommon(program.command('predict').description('Issue multi-horizon live predictions from the newest unlabeled feature row')).action(async opts => {
  const { prediction } = await runWithTargetLock(opts, () => predictOnly(opts));
  console.log(JSON.stringify(prediction, null, 2));
});

applyCommon(program.command('evaluate').description('Score all pending predictions once the needed future bars exist')).action(async opts => {
  const { evaluated, state } = await runWithTargetLock(opts, () => evaluateOnly(opts));
  console.log(JSON.stringify({ evaluatedCount: evaluated.length, feedbackSummary: state.feedback, evaluated }, null, 2));
});

applyCommon(program.command('run-daily').description('Fetch, evaluate pending predictions, retrain, backtest, and issue multi-horizon live predictions')).action(async opts => {
  const result = await runWithTargetLock(opts, () => runDaily(opts));
  console.log(JSON.stringify({
    provider: result.state.features.provider,
    latestRegime: result.state.features.latestFeature?.regime ?? null,
    evaluatedCount: result.evaluated.length,
    prediction: result.prediction,
    backtests: result.backtests,
    feedbackSummary: result.feedbackSummary,
    summary: result.state.metrics.summary
  }, null, 2));
});

applyCommon(program.command('backtest').description('Run walk-forward backtests from stored/generated training rows')).action(async opts => {
  const fetched = await runWithTargetLock(opts, () => fetchOnly(opts));
  const backtests = Object.fromEntries(Object.entries(fetched.state.features.trainingRowsByHorizon || {}).map(([k, rows]) => [k, walkForward(rows)]));
  console.log(JSON.stringify({
    provider: fetched.state.features.provider,
    latestRegime: fetched.state.features.latestFeature?.regime ?? null,
    horizons: Object.fromEntries(Object.entries(backtests).map(([k, v]) => [k, {
      accuracy: v.accuracy,
      brier: v.brier,
      logLoss: v.logLoss,
      observations: v.results.length,
      regimeStats: v.regimeStats,
      latestComponentWeights: v.latestComponentWeights,
      latestCalibrator: v.latestCalibrator
    }]))
  }, null, 2));
});

applyCommon(program.command('tournament').description('Run an additive tournament across logistic, heuristic, raw ensemble, and calibrated ensemble entrants')).action(async opts => {
  const { model, state } = await runWithTargetLock(opts, () => trainOnly(opts));
  console.log(JSON.stringify({
    provider: state.features.provider,
    latestRegime: model.latestRegime,
    horizons: Object.fromEntries(Object.entries(model.tournaments || {}).map(([k, t]) => [k, {
      observations: t.observations,
      champion: t.champion,
      regimeChampions: t.regimeChampions,
      metaWeights: t.metaWeights,
      ranked: t.ranked
    }]))
  }, null, 2));
});

applyCommon(program.command('tournament-predict').description('Produce an additive live meta-ensemble overlay from tournament rankings')).action(async opts => {
  const overlay = await runWithTargetLock(opts, () => tournamentPredictOnly(opts));
  console.log(JSON.stringify(overlay, null, 2));
});

applyPolicyOptions(program.command('policy-predict').description('Apply confidence gating and multi-horizon consensus policies to the additive tournament overlay')).action(async opts => {
  const policy = await runWithTargetLock(opts, () => policyOnly(opts, policyConfigFromOpts(opts)));
  console.log(JSON.stringify(policy, null, 2));
});

applyRiskOptions(program.command('risk-predict').description('Apply position sizing and risk rules on top of the gated policy overlay')).action(async opts => {
  const risk = await runWithTargetLock(opts, () => riskOnly(opts, policyConfigFromOpts(opts), riskConfigFromOpts(opts)));
  console.log(JSON.stringify(risk, null, 2));
});


applyCommon(program.command('import-predictions').description('Import bulk historical standardized prediction records into the local prediction ledger')).requiredOption('--input <file[,file2]>', 'JSONL or JSON array file(s) containing mps.prediction.v1 records').action(async opts => {
  const result = await runWithTargetLock(opts, () => importPredictionLedger(opts));
  console.log(JSON.stringify({
    importedType: 'prediction',
    existingCount: result.existingCount,
    importedCount: result.importedCount,
    addedCount: result.addedCount,
    totalCount: result.totalCount,
    feedbackSummary: result.feedbackSummary
  }, null, 2));
});

applyCommon(program.command('import-feedback').description('Import bulk historical standardized resolved feedback records into the local feedback ledger')).requiredOption('--input <file[,file2]>', 'JSONL or JSON array file(s) containing mps.feedback.v1 records').action(async opts => {
  const result = await runWithTargetLock(opts, () => importFeedbackLedger(opts));
  console.log(JSON.stringify({
    importedType: 'feedback',
    existingCount: result.existingCount,
    importedCount: result.importedCount,
    addedCount: result.addedCount,
    totalCount: result.totalCount,
    feedbackSummary: result.feedbackSummary
  }, null, 2));
});

applyCommon(program.command('replay-feedback').description('Rebuild the self-training summary from existing standardized ledgers')).action(async opts => {
  const result = await runWithTargetLock(opts, () => replayFeedback(opts));
  console.log(JSON.stringify({
    predictionLedgerCount: result.predictionLedgerCount,
    feedbackLedgerCount: result.feedbackLedgerCount,
    feedbackSummary: result.feedbackSummary
  }, null, 2));
});

applyCommon(program.command('feedback-report').description('Inspect standardized prediction/feedback ledgers and self-training summary')).action(async opts => {
  const paths = statePaths(opts.stateDir, opts.asset, opts.symbol);
  const state = loadState(paths);
  const predictionLedger = parseJsonl(paths.predictionLedger);
  const feedbackLedger = parseJsonl(paths.feedbackLedger);
  console.log(JSON.stringify({
    provider: state.features.provider,
    latestRegime: state.features.latestFeature?.regime ?? null,
    feedbackSummary: state.feedback,
    predictionLedgerCount: predictionLedger.length,
    feedbackLedgerCount: feedbackLedger.length,
    lastPredictionRecord: predictionLedger.slice(-1)[0] ?? null,
    lastFeedbackRecord: feedbackLedger.slice(-1)[0] ?? null
  }, null, 2));
});

applyCommon(program.command('report').description('Show local model, predictions, summary metrics, and self-training state')).action(async opts => {
  const paths = statePaths(opts.stateDir, opts.asset, opts.symbol);
  const state = loadState(paths);
  console.log(JSON.stringify({
    provider: state.features.provider,
    bars: state.bars.length,
    horizons: state.features.horizons,
    trainingRowsByHorizon: Object.fromEntries(Object.entries(state.features.trainingRowsByHorizon || {}).map(([k, rows]) => [k, rows.length])),
    latestFeatureTimestamp: state.features.latestFeature?.timestamp ?? null,
    latestRegime: state.features.latestFeature?.regime ?? null,
    summary: state.metrics.summary,
    feedback: state.feedback,
    latestBacktests: (state.metrics.backtests || []).slice(-9),
    recentPredictions: state.predictions.slice(-3),
    tournaments: state.model?.tournaments,
    model: state.model
  }, null, 2));
});

applyCommon(program.command('prune-state').description('Trim old scored predictions and metrics from local state')).option('--retention-days <days>', 'Keep scored state for this many days', value => Number(value), 120).option('--max-predictions <count>', 'Maximum prediction/backtest records to keep', value => Number(value), 200).option('--dry-run', 'Show what would be removed without writing', false).action(async opts => {
  const result = await runWithTargetLock(opts, () => maintainState({
    stateDir: opts.stateDir,
    asset: opts.asset,
    symbol: opts.symbol,
    retentionDays: opts.retentionDays,
    maxPredictions: opts.maxPredictions,
    dryRun: opts.dryRun
  }));
  console.log(JSON.stringify(result, null, 2));
});

applyCommon(program.command('doctor').description('Inspect state files and sizes for a target')).action(async opts => {
  const result = doctorState({ stateDir: opts.stateDir, asset: opts.asset, symbol: opts.symbol });
  console.log(JSON.stringify(result, null, 2));
});

program.parseAsync(process.argv).catch(error => {
  console.error(error.stack || String(error));
  process.exit(1);
});
