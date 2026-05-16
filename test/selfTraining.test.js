import test from 'node:test';
import assert from 'node:assert/strict';
import { applySelfTrainingAdjustment, buildFeedbackLedgerRecords, buildPredictionLedgerRecord, summarizeFeedbackRecords } from '../src/models/selfTraining.js';

function makePrediction() {
  return {
    predictionId: 'stocks:AAPL:2026-01-10T00:00:00.000Z:1',
    createdAt: '2026-01-10T00:00:00.000Z',
    baseTimestamp: '2026-01-10T00:00:00.000Z',
    referenceClose: 100,
    provider: 'test-provider',
    regime: 'bull-high-vol-breakout',
    horizons: {
      '1p': {
        horizonDays: 1,
        probabilityUp: 0.7,
        baseProbabilityUp: 0.68,
        direction: 'up',
        actualDirection: 'down',
        actualClose: 99,
        targetTimestamp: '2026-01-11T00:00:00.000Z',
        correct: false,
        brier: 0.49,
        logLoss: 1.2,
        scoredAt: '2026-01-11T00:00:00.000Z'
      }
    }
  };
}

test('standardized prediction and feedback records are generated', () => {
  const prediction = makePrediction();
  const predictionRecord = buildPredictionLedgerRecord(prediction, 'stocks', 'AAPL');
  const feedbackRecords = buildFeedbackLedgerRecords(prediction, 'stocks', 'AAPL');
  assert.equal(predictionRecord.schemaVersion, 'mps.prediction.v1');
  assert.equal(feedbackRecords.length, 1);
  assert.equal(feedbackRecords[0].schemaVersion, 'mps.feedback.v1');
  assert.equal(feedbackRecords[0].actual, 0);
});

test('feedback summary and adjustment learn from resolved records', () => {
  const rows = [];
  for (let i = 0; i < 8; i++) {
    rows.push({
      schemaVersion: 'mps.feedback.v1',
      recordType: 'prediction_resolved',
      predictionId: `p-${i}`,
      scoredAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      horizon: '3p',
      regime: 'bull-high-vol-breakout',
      probabilityUp: 0.72,
      actual: 0,
      correct: false,
      brier: 0.5184,
      logLoss: 1.27
    });
  }
  const summary = summarizeFeedbackRecords(rows);
  const adjusted = applySelfTrainingAdjustment(0.74, summary, '3p', 'bull-high-vol-breakout');
  assert.equal(summary.byHorizon['3p'].observations, 8);
  assert.ok(adjusted.adjustment.applied);
  assert.ok(adjusted.probabilityUp < 0.74);
});
