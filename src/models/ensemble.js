import { clamp, sigmoid } from '../utils/math.js';
import { predictHeuristicProbability } from './heuristicSignals.js';
import { predictProbability } from './onlineLogistic.js';

const DEFAULT_WEIGHTS = { logistic: 0.6, heuristic: 0.4 };
const DEFAULT_CALIBRATOR = { a: 1, b: 0, sampleSize: 0 };

export function clampProbability(p) {
  return clamp(p, 1e-6, 1 - 1e-6);
}

function logit(p) {
  const q = clampProbability(p);
  return Math.log(q / (1 - q));
}

function normalizeWeights(logistic, heuristic) {
  const total = logistic + heuristic;
  if (!Number.isFinite(total) || total <= 0) return DEFAULT_WEIGHTS;
  return { logistic: logistic / total, heuristic: heuristic / total };
}

export function weightsFromLossHistory(history, window = 40) {
  const recent = history.slice(-window);
  if (!recent.length) return DEFAULT_WEIGHTS;
  const logisticLoss = recent.reduce((sum, item) => sum + item.logisticLoss, 0) / recent.length;
  const heuristicLoss = recent.reduce((sum, item) => sum + item.heuristicLoss, 0) / recent.length;
  return normalizeWeights(1 / (logisticLoss + 0.03), 1 / (heuristicLoss + 0.03));
}

export function fitPlattCalibrator(samples, window = 80, epochs = 250, learningRate = 0.03) {
  const recent = samples.slice(-window).filter(sample => Number.isFinite(sample.p) && Number.isFinite(sample.y));
  if (recent.length < 20) return { ...DEFAULT_CALIBRATOR, sampleSize: recent.length };
  let a = 1;
  let b = 0;
  for (let epoch = 0; epoch < epochs; epoch++) {
    let gradA = 0;
    let gradB = 0;
    for (const sample of recent) {
      const x = logit(sample.p);
      const q = sigmoid(a * x + b);
      const error = q - sample.y;
      gradA += error * x;
      gradB += error;
    }
    a -= learningRate * (gradA / recent.length);
    b -= learningRate * (gradB / recent.length);
  }
  return { a, b, sampleSize: recent.length };
}

export function applyCalibrator(probability, calibrator = DEFAULT_CALIBRATOR) {
  if (!calibrator || !Number.isFinite(calibrator.a) || !Number.isFinite(calibrator.b)) return clampProbability(probability);
  return clampProbability(sigmoid(calibrator.a * logit(probability) + calibrator.b));
}

export function predictEnsembleRaw(model, features, componentWeights = model.componentWeights ?? DEFAULT_WEIGHTS) {
  const logisticProbability = predictProbability(model, features);
  const heuristicProbability = predictHeuristicProbability(features);
  const rawProbabilityUp = componentWeights.logistic * logisticProbability + componentWeights.heuristic * heuristicProbability;
  return {
    logisticProbability,
    heuristicProbability,
    rawProbabilityUp: clampProbability(rawProbabilityUp),
    componentWeights
  };
}

export function predictEnsemble(model, features, componentWeights = model.componentWeights ?? DEFAULT_WEIGHTS, calibrator = model.calibrator ?? DEFAULT_CALIBRATOR) {
  const raw = predictEnsembleRaw(model, features, componentWeights);
  const probabilityUp = applyCalibrator(raw.rawProbabilityUp, calibrator);
  return {
    ...raw,
    probabilityUp,
    probabilityDown: 1 - probabilityUp,
    calibrator
  };
}
