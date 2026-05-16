import path from 'node:path';
import { readJson, writeJson } from '../utils/fs.js';

export function statePaths(stateDir, asset, symbol) {
  const base = path.join(stateDir, asset, symbol.toUpperCase());
  return {
    base,
    bars: path.join(base, 'bars.json'),
    features: path.join(base, 'features.json'),
    model: path.join(base, 'model.json'),
    predictions: path.join(base, 'predictions.json'),
    metrics: path.join(base, 'metrics.json'),
    feedback: path.join(base, 'feedback.json'),
    predictionLedger: path.join(base, 'prediction-ledger.jsonl'),
    feedbackLedger: path.join(base, 'feedback-records.jsonl')
  };
}

export function loadState(paths) {
  const rawFeatures = readJson(paths.features, { trainingRowsByHorizon: {}, latestFeature: null, provider: null, updatedAt: null, horizons: [] });
  const features = Array.isArray(rawFeatures)
    ? { trainingRowsByHorizon: { '1p': rawFeatures }, latestFeature: null, provider: null, updatedAt: null, horizons: ['1p'] }
    : rawFeatures?.trainingRows
      ? { trainingRowsByHorizon: { '1p': rawFeatures.trainingRows }, latestFeature: rawFeatures.latestFeature ?? null, provider: rawFeatures.provider ?? null, updatedAt: rawFeatures.updatedAt ?? null, horizons: rawFeatures.horizons ?? ['1p'] }

      : { trainingRowsByHorizon: rawFeatures.trainingRowsByHorizon ?? {}, latestFeature: rawFeatures.latestFeature ?? null, provider: rawFeatures.provider ?? null, updatedAt: rawFeatures.updatedAt ?? null, horizons: rawFeatures.horizons ?? Object.keys(rawFeatures.trainingRowsByHorizon ?? {}) };
  return {
    bars: readJson(paths.bars, []),
    features,
    model: readJson(paths.model, {}),
    predictions: readJson(paths.predictions, []),
    metrics: readJson(paths.metrics, { evaluations: [], backtests: [], summary: {} }),
    feedback: readJson(paths.feedback, { schemaVersion: 'mps.feedback-summary.v1', recentObservations: 0, byHorizon: {}, byHorizonRegime: {}, updatedAt: null, predictionLedgerCount: 0, feedbackLedgerCount: 0 })
  };
}

export function saveState(paths, state) {
  writeJson(paths.bars, state.bars ?? []);
  writeJson(paths.features, state.features ?? { trainingRowsByHorizon: {}, latestFeature: null, provider: null, updatedAt: null, horizons: [] });
  writeJson(paths.model, state.model ?? {});
  writeJson(paths.predictions, state.predictions ?? []);
  writeJson(paths.metrics, state.metrics ?? { evaluations: [], backtests: [], summary: {} });
  writeJson(paths.feedback, state.feedback ?? { schemaVersion: 'mps.feedback-summary.v1', recentObservations: 0, byHorizon: {}, byHorizonRegime: {}, updatedAt: null, predictionLedgerCount: 0, feedbackLedgerCount: 0 });
}
