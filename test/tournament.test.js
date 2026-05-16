import test from 'node:test';
import assert from 'node:assert/strict';
import { runTournament } from '../src/models/tournament.js';

function makeRow(i, target, regime = 'bull-calm-range') {
  return {
    timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
    target,
    regime,
    features: {
      mom1: target ? 0.02 : -0.02,
      mom3: target ? 0.03 : -0.03,
      mom5: target ? 0.04 : -0.04,
      mom10: target ? 0.05 : -0.05,
      sma5_20: target ? 0.02 : -0.02,
      sma10_50: target ? 0.03 : -0.03,
      ema12_26: target ? 0.01 : -0.01,
      macdSignalGap: target ? 0.01 : -0.01,
      rsi14: target ? 0.2 : -0.2,
      stoch14: target ? 0.2 : -0.2,
      vol10: 0.01,
      atr14: 0.01,
      bollingerZ20: target ? 0.2 : -0.2,
      breakout20: target ? 0.3 : -0.3,
      rangeCompression10: 0.02,
      volZ: 0.1,
      volumeTrend5: 0.05,
      meanRev20: target ? 0.02 : -0.02,
      streak5: target ? 0.6 : -0.6
    }
  };
}

test('runTournament returns ranked entrants and normalized meta weights', () => {
  const rows = [];
  for (let i = 0; i < 130; i++) rows.push(makeRow(i, i % 2 === 0 ? 1 : 0, i % 3 === 0 ? 'bull-high-vol-breakout' : 'bear-high-vol-breakdown'));
  const tournament = runTournament(rows);
  assert.ok(tournament.observations > 0);
  assert.ok(Array.isArray(tournament.ranked));
  assert.ok(tournament.ranked.length >= 4);
  const total = Object.values(tournament.metaWeights).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.ok(typeof tournament.champion === 'string');
});
