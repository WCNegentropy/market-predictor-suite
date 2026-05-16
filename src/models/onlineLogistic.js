import { dot, sigmoid } from '../utils/math.js';

export function createModel(existing = {}) {
  return {
    learningRate: existing.learningRate ?? 0.09,
    bias: existing.bias ?? 0,
    weights: existing.weights ?? {},
    componentWeights: existing.componentWeights ?? { logistic: 0.6, heuristic: 0.4 },
    calibrator: existing.calibrator ?? { a: 1, b: 0, sampleSize: 0 },
    trainingExamples: existing.trainingExamples ?? 0,
    quality: existing.quality ?? null,
    lastTrainedAt: existing.lastTrainedAt ?? null
  };
}

export function predictScore(model, features) {
  return model.bias + dot(model.weights, features);
}

export function predictProbability(model, features) {
  return sigmoid(predictScore(model, features));
}

export function trainEpoch(model, rows, epochs = 4) {
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const row of rows) {
      const p = predictProbability(model, row.features);
      const error = row.target - p;
      model.bias += model.learningRate * error;
      for (const [key, value] of Object.entries(row.features)) {
        model.weights[key] = (model.weights[key] ?? 0) + model.learningRate * error * value;
      }
      model.trainingExamples += 1;
    }
  }
  return model;
}
