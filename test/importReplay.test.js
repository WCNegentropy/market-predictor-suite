import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importFeedbackLedger, importPredictionLedger, replayFeedback } from '../src/pipeline/importReplay.js';

function tempStateDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mps-import-'));
}

test('bulk import merges standardized prediction and feedback records then rebuilds summary', () => {
  const stateDir = tempStateDir();
  const asset = 'stocks';
  const symbol = 'AAPL';
  const predictionsFile = path.join(stateDir, 'predictions.jsonl');
  const feedbackFile = path.join(stateDir, 'feedback.jsonl');

  const predictionRecord = {
    schemaVersion: 'mps.prediction.v1',
    recordType: 'prediction_created',
    predictionId: 'stocks:AAPL:2026-01-01T00:00:00.000Z:1',
    createdAt: '2026-01-01T00:00:00.000Z',
    asset,
    symbol,
    provider: 'test-provider',
    baseTimestamp: '2026-01-01T00:00:00.000Z',
    referenceClose: 100,
    regime: 'bull-high-vol-breakout',
    horizons: { '1p': { horizonDays: 1, probabilityUp: 0.61, direction: 'up' } }
  };
  const feedbackRecord = {
    schemaVersion: 'mps.feedback.v1',
    recordType: 'prediction_resolved',
    predictionId: predictionRecord.predictionId,
    scoredAt: '2026-01-02T00:00:00.000Z',
    asset,
    symbol,
    provider: 'test-provider',
    baseTimestamp: '2026-01-01T00:00:00.000Z',
    targetTimestamp: '2026-01-02T00:00:00.000Z',
    referenceClose: 100,
    actualClose: 103,
    regime: 'bull-high-vol-breakout',
    horizon: '1p',
    horizonDays: 1,
    probabilityUp: 0.61,
    baseProbabilityUp: 0.61,
    direction: 'up',
    actual: 1,
    actualDirection: 'up',
    correct: true,
    brier: 0.1521,
    logLoss: 0.4943,
    components: { logisticProbability: 0.58 },
    componentWeights: { logistic: 1 },
    feedbackAdjustment: null
  };

  fs.writeFileSync(predictionsFile, JSON.stringify(predictionRecord) + '\n');
  fs.writeFileSync(feedbackFile, JSON.stringify(feedbackRecord) + '\n');

  const importedPredictions = importPredictionLedger({ stateDir, asset, symbol, input: predictionsFile });
  const importedFeedback = importFeedbackLedger({ stateDir, asset, symbol, input: feedbackFile });
  const replayed = replayFeedback({ stateDir, asset, symbol });

  assert.equal(importedPredictions.addedCount, 1);
  assert.equal(importedFeedback.addedCount, 1);
  assert.equal(replayed.feedbackSummary.recentObservations, 1);
  assert.equal(replayed.feedbackSummary.byHorizon['1p'].observations, 1);
  assert.equal(replayed.feedbackSummary.byHorizonRegime['1p']['bull-high-vol-breakout'].accuracy, 1);
});

