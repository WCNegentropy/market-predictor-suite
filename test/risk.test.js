import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRiskSnapshot } from '../src/models/risk.js';

function basePolicy() {
  return {
    provider: 'test-provider',
    latestRegime: 'bull-high-vol-breakout',
    baseTimestamp: '2026-05-16T00:00:00.000Z',
    referenceClose: 100,
    config: { minHorizonConfidence: 0.55 },
    horizons: {
      '1p': { direction: 'up', gated: true, consensusSpread: 0.18 },
      '3p': { direction: 'up', gated: true, consensusSpread: 0.16 },
      '5p': { direction: 'up', gated: false, consensusSpread: 0.2 }
    },
    consensus: {
      dominantDirection: 'up',
      action: 'long',
      gated: true,
      upWeight: 3.55,
      downWeight: 0,
      consensusWeight: 1,
      alignedHorizons: 3,
      gatedAlignedHorizons: 2,
      gatedAlignedWeight: 2.55,
      averageAlignedConfidence: 0.72
    }
  };
}

test('risk snapshot produces sized long trade with stops and target', () => {
  const snapshot = buildRiskSnapshot(basePolicy());
  assert.equal(snapshot.tradeAllowed, true);
  assert.equal(snapshot.action, 'long');
  assert.ok(snapshot.position.exposureFraction > 0);
  assert.ok(snapshot.risk.stopLossPrice < snapshot.referenceClose);
  assert.ok(snapshot.risk.takeProfitPrice > snapshot.referenceClose);
  assert.ok(snapshot.risk.rewardToRisk >= 1.5);
});

test('risk snapshot blocks trade when policy is hold', () => {
  const snapshot = buildRiskSnapshot({
    ...basePolicy(),
    consensus: {
      ...basePolicy().consensus,
      action: 'hold',
      gated: false,
      gatedAlignedHorizons: 0,
      gatedAlignedWeight: 0,
      averageAlignedConfidence: 0
    }
  });
  assert.equal(snapshot.tradeAllowed, false);
  assert.equal(snapshot.action, 'hold');
  assert.ok(snapshot.noTradeConditions.includes('policy-hold'));
  assert.equal(snapshot.position.exposureFraction, 0);
});
