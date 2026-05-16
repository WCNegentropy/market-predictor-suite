import { clampProbability, predictEnsemble, predictEnsembleRaw } from './ensemble.js';
import { predictHeuristicProbability } from './heuristicSignals.js';
import { predictProbability } from './onlineLogistic.js';
import { walkForward } from '../backtest/walkForward.js';

const ENTRANTS = [
  { key: 'logistic', label: 'Online Logistic' },
  { key: 'heuristic', label: 'Heuristic Signals' },
  { key: 'ensembleRaw', label: 'Raw Ensemble' },
  { key: 'ensembleCalibrated', label: 'Calibrated Ensemble' }
];

function probabilityForEntrant(result, key) {
  if (key === 'logistic') return result.logisticProbability;
  if (key === 'heuristic') return result.heuristicProbability;
  if (key === 'ensembleRaw') return result.rawProbabilityUp;
  return result.probabilityUp;
}

function logLoss(probability, actual) {
  const p = clampProbability(probability);
  return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
}

function summarizeResults(results, entrantKey) {
  const observations = results.length;
  if (!observations) return { observations: 0, accuracy: 0, brier: 0, logLoss: 0 };
  let correct = 0;
  let brierTotal = 0;
  let logLossTotal = 0;
  for (const result of results) {
    const probability = probabilityForEntrant(result, entrantKey);
    const prediction = probability >= 0.5 ? 1 : 0;
    if (prediction === result.actual) correct += 1;
    brierTotal += (probability - result.actual) ** 2;
    logLossTotal += logLoss(probability, result.actual);
  }
  return {
    observations,
    accuracy: correct / observations,
    brier: brierTotal / observations,
    logLoss: logLossTotal / observations
  };
}

function summarizeByRegime(results, entrantKey) {
  const grouped = {};
  for (const result of results) {
    const regime = result.regime || 'unknown';
    grouped[regime] ??= [];
    grouped[regime].push(result);
  }
  return Object.fromEntries(Object.entries(grouped).map(([regime, regimeResults]) => [regime, summarizeResults(regimeResults, entrantKey)]));
}

function entrantScore(summary) {
  return summary.brier + summary.logLoss * 0.35 - summary.accuracy * 0.1;
}

function rankEntrants(entrants) {
  return [...entrants].sort((a, b) => {
    const diff = entrantScore(a.summary) - entrantScore(b.summary);
    if (diff !== 0) return diff;
    return a.summary.logLoss - b.summary.logLoss;
  });
}

function normalizeWeights(weightMap) {
  const total = Object.values(weightMap).reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) {
    const equal = 1 / Object.keys(weightMap).length;
    return Object.fromEntries(Object.keys(weightMap).map(key => [key, equal]));
  }
  return Object.fromEntries(Object.entries(weightMap).map(([key, value]) => [key, value / total]));
}

function computeMetaWeights(rankedEntrants) {
  return normalizeWeights(Object.fromEntries(rankedEntrants.map(entrant => [entrant.key, 1 / Math.max(entrantScore(entrant.summary), 1e-6)])));
}

function computeRegimeChampions(results, entrants, fallbackChampion) {
  const regimes = new Set(results.map(result => result.regime || 'unknown'));
  const map = {};
  for (const regime of regimes) {
    const regimeEntrants = entrants.map(entrant => ({
      key: entrant.key,
      summary: summarizeResults(results.filter(result => (result.regime || 'unknown') === regime), entrant.key)
    })).filter(entrant => entrant.summary.observations > 0);
    const viable = regimeEntrants.filter(entrant => entrant.summary.observations >= 5);
    const ranked = rankEntrants(viable.length ? viable : regimeEntrants);
    map[regime] = ranked[0]?.key ?? fallbackChampion;
  }
  return map;
}

export function runTournament(rows) {
  const backtest = walkForward(rows);
  const entrants = ENTRANTS.map(entrant => ({
    ...entrant,
    summary: summarizeResults(backtest.results, entrant.key),
    regimeStats: summarizeByRegime(backtest.results, entrant.key)
  }));
  const ranked = rankEntrants(entrants);
  const champion = ranked[0]?.key ?? 'ensembleCalibrated';
  const regimeChampions = computeRegimeChampions(backtest.results, entrants, champion);
  const metaWeights = computeMetaWeights(ranked);
  return {
    observations: backtest.results.length,
    entrants,
    ranked: ranked.map(entrant => ({ key: entrant.key, label: entrant.label, summary: entrant.summary })),
    champion,
    regimeChampions,
    metaWeights,
    backtestSummary: {
      accuracy: backtest.accuracy,
      brier: backtest.brier,
      logLoss: backtest.logLoss,
      latestComponentWeights: backtest.latestComponentWeights,
      latestCalibrator: backtest.latestCalibrator
    }
  };
}

export function buildTournamentLiveOverlay(horizonModel, features, tournament, regime = 'unknown') {
  const logisticProbability = predictProbability(horizonModel, features);
  const heuristicProbability = predictHeuristicProbability(features);
  const raw = predictEnsembleRaw(horizonModel, features, horizonModel.componentWeights);
  const calibrated = predictEnsemble(horizonModel, features, horizonModel.componentWeights, horizonModel.calibrator);
  const entrants = {
    logistic: logisticProbability,
    heuristic: heuristicProbability,
    ensembleRaw: raw.rawProbabilityUp,
    ensembleCalibrated: calibrated.probabilityUp
  };
  const metaWeights = tournament?.metaWeights ?? { logistic: 0.2, heuristic: 0.2, ensembleRaw: 0.2, ensembleCalibrated: 0.4 };
  const regimeChampion = tournament?.regimeChampions?.[regime] ?? tournament?.champion ?? 'ensembleCalibrated';
  const champion = tournament?.champion ?? 'ensembleCalibrated';
  const metaProbabilityUp = Object.entries(metaWeights).reduce((sum, [key, weight]) => sum + (entrants[key] ?? 0) * weight, 0);
  const spread = Math.max(...Object.values(entrants)) - Math.min(...Object.values(entrants));
  return {
    entrants,
    champion,
    regimeChampion,
    metaWeights,
    metaProbabilityUp,
    metaDirection: metaProbabilityUp >= 0.5 ? 'up' : 'down',
    championProbabilityUp: entrants[champion],
    regimeChampionProbabilityUp: entrants[regimeChampion],
    consensusSpread: spread
  };
}
