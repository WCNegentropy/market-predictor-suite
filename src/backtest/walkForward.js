import { applyCalibrator, clampProbability, fitPlattCalibrator, predictEnsembleRaw, weightsFromLossHistory } from '../models/ensemble.js';
import { predictHeuristicProbability } from '../models/heuristicSignals.js';
import { createModel, predictProbability, trainEpoch } from '../models/onlineLogistic.js';

function logLoss(probability, actual) {
  const p = clampProbability(probability);
  return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
}

function summarizeByRegime(results) {
  const grouped = {};
  for (const row of results) {
    const key = row.regime || 'unknown';
    grouped[key] ??= { observations: 0, correct: 0, brierTotal: 0, logLossTotal: 0 };
    grouped[key].observations += 1;
    grouped[key].correct += row.correct;
    grouped[key].brierTotal += (row.probabilityUp - row.actual) ** 2;
    grouped[key].logLossTotal += logLoss(row.probabilityUp, row.actual);
  }
  return Object.fromEntries(Object.entries(grouped).map(([key, value]) => [key, {
    observations: value.observations,
    accuracy: value.observations ? value.correct / value.observations : 0,
    brier: value.observations ? value.brierTotal / value.observations : 0,
    logLoss: value.observations ? value.logLossTotal / value.observations : 0
  }]));
}

export function walkForward(rows, warmup = 90) {
  if (rows.length <= warmup) {
    return {
      accuracy: 0,
      brier: 0,
      logLoss: 0,
      results: [],
      regimeStats: {},
      latestComponentWeights: { logistic: 0.6, heuristic: 0.4 },
      latestCalibrator: { a: 1, b: 0, sampleSize: 0 }
    };
  }
  const model = createModel();
  trainEpoch(model, rows.slice(0, warmup), 4);
  const lossHistory = [];
  const calibrationHistory = [];
  const results = [];
  for (let i = warmup; i < rows.length; i++) {
    const row = rows[i];
    const componentWeights = weightsFromLossHistory(lossHistory, 40);
    const raw = predictEnsembleRaw(model, row.features, componentWeights);
    const calibrator = fitPlattCalibrator(calibrationHistory, 80);
    const probabilityUp = applyCalibrator(raw.rawProbabilityUp, calibrator);
    const actual = row.target;
    const prediction = probabilityUp >= 0.5 ? 1 : 0;
    const logisticProbability = predictProbability(model, row.features);
    const heuristicProbability = predictHeuristicProbability(row.features);
    lossHistory.push({
      logisticLoss: (logisticProbability - actual) ** 2,
      heuristicLoss: (heuristicProbability - actual) ** 2
    });
    calibrationHistory.push({ p: raw.rawProbabilityUp, y: actual });
    results.push({
      timestamp: row.timestamp,
      regime: row.regime,
      prediction,
      actual,
      correct: prediction === actual ? 1 : 0,
      probabilityUp,
      rawProbabilityUp: raw.rawProbabilityUp,
      logisticProbability,
      heuristicProbability,
      componentWeights,
      calibrator
    });
    trainEpoch(model, [row], 1);
  }
  const accuracy = results.reduce((sum, row) => sum + row.correct, 0) / results.length;
  const brier = results.reduce((sum, row) => sum + (row.probabilityUp - row.actual) ** 2, 0) / results.length;
  const averageLogLoss = results.reduce((sum, row) => sum + logLoss(row.probabilityUp, row.actual), 0) / results.length;
  return {
    accuracy,
    brier,
    logLoss: averageLogLoss,
    results,
    regimeStats: summarizeByRegime(results),
    latestComponentWeights: weightsFromLossHistory(lossHistory, 40),
    latestCalibrator: fitPlattCalibrator(calibrationHistory, 80)
  };
}
