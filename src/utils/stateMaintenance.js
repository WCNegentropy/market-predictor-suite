import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeJson } from './fs.js';

function isOlderThan(isoTimestamp, cutoffMs) {
  const t = new Date(isoTimestamp || 0).getTime();
  return Number.isFinite(t) && t < cutoffMs;
}

export function targetStateDir(stateDir, asset, symbol) {
  return path.join(stateDir, asset, symbol.toUpperCase());
}

export function maintainState({ stateDir, asset, symbol, retentionDays = 120, maxPredictions = 200, dryRun = false }) {
  const dir = targetStateDir(stateDir, asset, symbol);
  const cutoffMs = Date.now() - retentionDays * 86400 * 1000;
  const files = {
    predictions: path.join(dir, 'predictions.json'),
    metrics: path.join(dir, 'metrics.json')
  };
  const predictions = readJson(files.predictions, []);
  const keptPredictions = predictions.filter(item => {
    const ts = item.scoredAt || item.createdAt || null;
    return !ts || !isOlderThan(ts, cutoffMs);
  }).slice(-maxPredictions);
  const removedPredictions = predictions.length - keptPredictions.length;

  const metrics = readJson(files.metrics, { evaluations: [], backtests: [], summary: {} });
  const keptEvaluations = (metrics.evaluations || []).filter(item => !isOlderThan(item.scoredAt, cutoffMs));
  const keptBacktests = (metrics.backtests || []).filter(item => !isOlderThan(item.createdAt, cutoffMs)).slice(-maxPredictions);
  const removedEvaluations = (metrics.evaluations || []).length - keptEvaluations.length;
  const removedBacktests = (metrics.backtests || []).length - keptBacktests.length;

  if (!dryRun) {
    writeJson(files.predictions, keptPredictions);
    writeJson(files.metrics, { ...metrics, evaluations: keptEvaluations, backtests: keptBacktests });
  }

  return {
    dir,
    removedPredictions,
    removedEvaluations,
    removedBacktests,
    keptPredictions: keptPredictions.length,
    keptEvaluations: keptEvaluations.length,
    keptBacktests: keptBacktests.length,
    dryRun
  };
}

export function doctorState({ stateDir, asset, symbol }) {
  const dir = targetStateDir(stateDir, asset, symbol);
  const files = ['bars.json', 'features.json', 'model.json', 'predictions.json', 'metrics.json', 'feedback.json', 'prediction-ledger.jsonl', 'feedback-records.jsonl'];
  const report = {};
  for (const file of files) {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) {
      report[file] = { exists: false };
      continue;
    }
    const stat = fs.statSync(full);
    report[file] = {
      exists: true,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString()
    };
  }
  return { dir, files: report };
}
