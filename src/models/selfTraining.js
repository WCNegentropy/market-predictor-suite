import fs from 'node:fs';
import path from 'node:path';
import { clampProbability } from './ensemble.js';

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function safeAverage(total, count) {
  return count > 0 ? total / count : 0;
}

export function parseJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  return text.split('\n').map(line => JSON.parse(line));
}

export function appendJsonl(file, records) {
  if (!records || !records.length) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = records.map(record => JSON.stringify(record)).join('\n') + '\n';
  fs.appendFileSync(file, payload);
}

export function buildPredictionLedgerRecord(prediction, asset, symbol) {
  return {
    schemaVersion: 'mps.prediction.v1',
    recordType: 'prediction_created',
    predictionId: prediction.predictionId,
    createdAt: prediction.createdAt,
    asset,
    symbol: symbol.toUpperCase(),
    provider: prediction.provider,
    baseTimestamp: prediction.baseTimestamp,
    referenceClose: prediction.referenceClose,
    regime: prediction.regime,
    horizons: prediction.horizons
  };
}

export function buildFeedbackLedgerRecords(prediction, asset, symbol) {
  const rows = [];
  for (const [label, horizon] of Object.entries(prediction.horizons || {})) {
    if (!horizon.scoredAt) continue;
    rows.push({
      schemaVersion: 'mps.feedback.v1',
      recordType: 'prediction_resolved',
      predictionId: prediction.predictionId ?? `${asset}:${symbol.toUpperCase()}:${prediction.baseTimestamp}:${label}`,
      scoredAt: horizon.scoredAt,
      asset,
      symbol: symbol.toUpperCase(),
      provider: prediction.provider,
      baseTimestamp: prediction.baseTimestamp,
      targetTimestamp: horizon.targetTimestamp,
      referenceClose: prediction.referenceClose,
      actualClose: horizon.actualClose,
      regime: prediction.regime,
      horizon: label,
      horizonPeriods: horizon.horizonDays ?? horizon.horizonPeriods,
      probabilityUp: horizon.probabilityUp,
      baseProbabilityUp: horizon.baseProbabilityUp ?? horizon.probabilityUp,
      direction: horizon.direction,
      isPump: horizon.isPump ?? 0,
      isCrash: horizon.isCrash ?? 0,
      move: horizon.move ?? 0,
      actual: horizon.actualDirection === 'up' ? 1 : 0,
      actualDirection: horizon.actualDirection,
      actualIsPump: horizon.actualIsPump ?? 0,
      actualIsCrash: horizon.actualIsCrash ?? 0,
      actualMove: horizon.actualMove ?? 0,
      correct: Boolean(horizon.correct),
      brier: horizon.brier,
      logLoss: horizon.logLoss,
      components: horizon.components,
      componentWeights: horizon.componentWeights,
      feedbackAdjustment: horizon.feedbackAdjustment ?? null
    });
  }
  return rows;
}

export function summarizeFeedbackRecords(records, recentLimit = 500) {
  const recent = records.slice(-recentLimit);
  const byHorizon = {};
  const byHorizonRegime = {};
  for (const row of recent) {
    const horizon = row.horizon || 'unknown';
    const regime = row.regime || 'unknown';
    byHorizon[horizon] ??= { observations: 0, correct: 0, brierTotal: 0, logLossTotal: 0, residualTotal: 0, edgeTotal: 0, latestScoredAt: null };
    byHorizonRegime[horizon] ??= {};
    byHorizonRegime[horizon][regime] ??= { observations: 0, correct: 0, brierTotal: 0, logLossTotal: 0, residualTotal: 0, edgeTotal: 0, latestScoredAt: null };
    const actual = row.actual;
    const probabilityUp = row.probabilityUp ?? 0.5;
    const edge = Math.abs(probabilityUp - 0.5) * 2;
    for (const bucket of [byHorizon[horizon], byHorizonRegime[horizon][regime]]) {
      bucket.observations += 1;
      bucket.correct += row.correct ? 1 : 0;
      bucket.brierTotal += row.brier ?? (probabilityUp - actual) ** 2;
      bucket.logLossTotal += row.logLoss ?? 0;
      bucket.residualTotal += actual - probabilityUp;
      bucket.edgeTotal += edge;
      bucket.latestScoredAt = row.scoredAt;
    }
  }
  const finalize = bucket => ({
    observations: bucket.observations,
    accuracy: safeAverage(bucket.correct, bucket.observations),
    avgBrier: safeAverage(bucket.brierTotal, bucket.observations),
    avgLogLoss: safeAverage(bucket.logLossTotal, bucket.observations),
    avgResidual: safeAverage(bucket.residualTotal, bucket.observations),
    avgEdge: safeAverage(bucket.edgeTotal, bucket.observations),
    latestScoredAt: bucket.latestScoredAt
  });
  return {
    schemaVersion: 'mps.feedback-summary.v1',
    recentObservations: recent.length,
    byHorizon: Object.fromEntries(Object.entries(byHorizon).map(([key, bucket]) => [key, finalize(bucket)])),
    byHorizonRegime: Object.fromEntries(Object.entries(byHorizonRegime).map(([horizon, regimes]) => [horizon, Object.fromEntries(Object.entries(regimes).map(([regime, bucket]) => [regime, finalize(bucket)]))])),
    updatedAt: new Date().toISOString()
  };
}

export function applySelfTrainingAdjustment(probabilityUp, feedbackSummary, horizon, regime) {
  const baseProbabilityUp = clampProbability(probabilityUp);
  const horizonStats = feedbackSummary?.byHorizon?.[horizon];
  const regimeStats = feedbackSummary?.byHorizonRegime?.[horizon]?.[regime];
  if (!horizonStats || horizonStats.observations < 5) {
    return {
      probabilityUp: baseProbabilityUp,
      adjustment: {
        applied: false,
        baseProbabilityUp,
        adjustedProbabilityUp: baseProbabilityUp,
        residualShift: 0,
        confidenceScale: 1,
        feedbackObservations: horizonStats?.observations ?? 0,
        regimeFeedbackObservations: regimeStats?.observations ?? 0
      }
    };
  }
  const residualShift = clamp((horizonStats.avgResidual ?? 0) * 0.35 + (regimeStats?.avgResidual ?? 0) * 0.65, -0.12, 0.12);
  const errorPenalty = clamp(Math.max((horizonStats.avgBrier ?? 0.25) - 0.25, (regimeStats?.avgBrier ?? 0.25) - 0.25) * 1.15, 0, 0.3);
  const confidenceScale = clamp(1 - errorPenalty, 0.7, 1.05);
  const shifted = clampProbability(baseProbabilityUp + residualShift);
  const adjustedProbabilityUp = clampProbability(0.5 + (shifted - 0.5) * confidenceScale);
  return {
    probabilityUp: adjustedProbabilityUp,
    adjustment: {
      applied: true,
      baseProbabilityUp,
      adjustedProbabilityUp,
      residualShift,
      confidenceScale,
      feedbackObservations: horizonStats.observations,
      regimeFeedbackObservations: regimeStats?.observations ?? 0,
      horizonAccuracy: horizonStats.accuracy,
      horizonAvgBrier: horizonStats.avgBrier,
      regimeAvgBrier: regimeStats?.avgBrier ?? null
    }
  };
}
