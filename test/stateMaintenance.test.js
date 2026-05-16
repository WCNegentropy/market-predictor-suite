import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { maintainState, doctorState } from '../src/utils/stateMaintenance.js';

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

test('maintainState prunes aged scored predictions and metrics', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mps-maintain-'));
  const dir = path.join(root, 'state', 'stocks', 'AAPL');
  const old = new Date(Date.now() - 200 * 86400 * 1000).toISOString();
  const recent = new Date().toISOString();
  writeJson(path.join(dir, 'predictions.json'), [
    { scoredAt: old, probabilityUp: 0.1 },
    { scoredAt: recent, probabilityUp: 0.2 },
    { probabilityUp: 0.3 }
  ]);
  writeJson(path.join(dir, 'metrics.json'), {
    evaluations: [{ scoredAt: old }, { scoredAt: recent }],
    backtests: [{ createdAt: old }, { createdAt: recent }],
    summary: {}
  });
  const result = maintainState({ stateDir: path.join(root, 'state'), asset: 'stocks', symbol: 'AAPL', retentionDays: 120, maxPredictions: 10 });
  const predictions = JSON.parse(fs.readFileSync(path.join(dir, 'predictions.json'), 'utf8'));
  const metrics = JSON.parse(fs.readFileSync(path.join(dir, 'metrics.json'), 'utf8'));
  assert.equal(result.removedPredictions, 1);
  assert.equal(result.removedEvaluations, 1);
  assert.equal(result.removedBacktests, 1);
  assert.equal(predictions.length, 2);
  assert.equal(metrics.evaluations.length, 1);
});

test('doctorState reports file existence and sizes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mps-doctor-'));
  const dir = path.join(root, 'state', 'crypto', 'BTCUSD');
  writeJson(path.join(dir, 'predictions.json'), [{ probabilityUp: 0.5 }]);
  const report = doctorState({ stateDir: path.join(root, 'state'), asset: 'crypto', symbol: 'BTCUSD' });
  assert.equal(report.files['predictions.json'].exists, true);
  assert.equal(report.files['bars.json'].exists, false);
  assert.ok(report.files['predictions.json'].sizeBytes > 0);
});
