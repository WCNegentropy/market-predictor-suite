import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPolicySnapshot } from '../src/models/policy.js';

const overlayTemplate = {
  provider: 'test-provider',
  latestRegime: 'bull-high-vol-breakout',
  baseTimestamp: '2026-05-16T00:00:00.000Z',
  referenceClose: 100,
  horizons: {}
};

test('policy snapshot gates in a strong aligned long consensus', () => {
  const snapshot = buildPolicySnapshot({
    ...overlayTemplate,
    horizons: {
      '1p': {
        metaProbabilityUp: 0.66,
        metaDirection: 'up',
        champion: 'ensembleCalibrated',
        regimeChampion: 'ensembleCalibrated',
        championProbabilityUp: 0.64,
        regimeChampionProbabilityUp: 0.63,
        consensusSpread: 0.18,
        entrants: { logistic: 0.62, heuristic: 0.58, ensembleRaw: 0.64, ensembleCalibrated: 0.63 },
        metaWeights: { logistic: 0.25, heuristic: 0.2, ensembleRaw: 0.25, ensembleCalibrated: 0.3 }
      },
      '3p': {
        metaProbabilityUp: 0.68,
        metaDirection: 'up',
        champion: 'ensembleRaw',
        regimeChampion: 'ensembleRaw',
        championProbabilityUp: 0.67,
        regimeChampionProbabilityUp: 0.66,
        consensusSpread: 0.15,
        entrants: { logistic: 0.65, heuristic: 0.59, ensembleRaw: 0.67, ensembleCalibrated: 0.66 },
        metaWeights: { logistic: 0.25, heuristic: 0.2, ensembleRaw: 0.3, ensembleCalibrated: 0.25 }
      },
      '5p': {
        metaProbabilityUp: 0.64,
        metaDirection: 'up',
        champion: 'logistic',
        regimeChampion: 'logistic',
        championProbabilityUp: 0.65,
        regimeChampionProbabilityUp: 0.65,
        consensusSpread: 0.16,
        entrants: { logistic: 0.65, heuristic: 0.57, ensembleRaw: 0.63, ensembleCalibrated: 0.62 },
        metaWeights: { logistic: 0.28, heuristic: 0.18, ensembleRaw: 0.27, ensembleCalibrated: 0.27 }
      }
    }
  });
  assert.equal(snapshot.consensus.gated, true);
  assert.equal(snapshot.consensus.action, 'long');
  assert.equal(snapshot.consensus.dominantDirection, 'up');
});

test('policy snapshot holds when horizons disagree and confidence is weak', () => {
  const snapshot = buildPolicySnapshot({
    ...overlayTemplate,
    horizons: {
      '1p': {
        metaProbabilityUp: 0.52,
        metaDirection: 'up',
        champion: 'logistic',
        regimeChampion: 'heuristic',
        championProbabilityUp: 0.49,
        regimeChampionProbabilityUp: 0.46,
        consensusSpread: 0.6,
        entrants: { logistic: 0.49, heuristic: 0.46, ensembleRaw: 0.52, ensembleCalibrated: 0.53 },
        metaWeights: { logistic: 0.25, heuristic: 0.25, ensembleRaw: 0.25, ensembleCalibrated: 0.25 }
      },
      '3p': {
        metaProbabilityUp: 0.47,
        metaDirection: 'down',
        champion: 'ensembleRaw',
        regimeChampion: 'logistic',
        championProbabilityUp: 0.49,
        regimeChampionProbabilityUp: 0.51,
        consensusSpread: 0.58,
        entrants: { logistic: 0.51, heuristic: 0.45, ensembleRaw: 0.49, ensembleCalibrated: 0.47 },
        metaWeights: { logistic: 0.25, heuristic: 0.25, ensembleRaw: 0.25, ensembleCalibrated: 0.25 }
      },
      '5p': {
        metaProbabilityUp: 0.51,
        metaDirection: 'up',
        champion: 'ensembleCalibrated',
        regimeChampion: 'ensembleRaw',
        championProbabilityUp: 0.5,
        regimeChampionProbabilityUp: 0.48,
        consensusSpread: 0.55,
        entrants: { logistic: 0.5, heuristic: 0.44, ensembleRaw: 0.48, ensembleCalibrated: 0.5 },
        metaWeights: { logistic: 0.25, heuristic: 0.25, ensembleRaw: 0.25, ensembleCalibrated: 0.25 }
      }
    }
  });
  assert.equal(snapshot.consensus.gated, false);
  assert.equal(snapshot.consensus.action, 'hold');
});
