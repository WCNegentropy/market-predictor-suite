function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function directionFromProbability(probabilityUp) {
  return probabilityUp >= 0.5 ? 'up' : 'down';
}

export const DEFAULT_POLICY_CONFIG = {
  minEdge: 0.06,
  minHorizonConfidence: 0.55,
  minConsensusWeight: 0.66,
  minAlignedHorizons: 2,
  maxConsensusSpread: 0.45,
  requireChampionAgreement: false,
  requireRegimeChampionAgreement: false,
  horizonWeights: {
    '1p': 1,
    '3p': 1.2,
    '5p': 1.35
  }
};

export function normalizePolicyConfig(config = {}) {
  return {
    ...DEFAULT_POLICY_CONFIG,
    ...config,
    horizonWeights: {
      ...DEFAULT_POLICY_CONFIG.horizonWeights,
      ...(config.horizonWeights || {})
    }
  };
}

export function evaluateHorizonPolicy(label, horizon, config = DEFAULT_POLICY_CONFIG) {
  const edge = Math.abs((horizon.metaProbabilityUp ?? 0.5) - 0.5) * 2;
  const championDirection = directionFromProbability(horizon.championProbabilityUp ?? 0.5);
  const regimeChampionDirection = directionFromProbability(horizon.regimeChampionProbabilityUp ?? 0.5);
  const championAgreement = championDirection === horizon.metaDirection;
  const regimeChampionAgreement = regimeChampionDirection === horizon.metaDirection;
  const spreadScore = clamp01(1 - ((horizon.consensusSpread ?? 1) / config.maxConsensusSpread));
  const confidence = clamp01(
    edge * 0.5 +
    (championAgreement ? 0.18 : 0) +
    (regimeChampionAgreement ? 0.17 : 0) +
    spreadScore * 0.15
  );

  const reasons = [];
  if (edge >= config.minEdge) reasons.push('edge-passed');
  else reasons.push('edge-too-small');
  if (confidence >= config.minHorizonConfidence) reasons.push('confidence-passed');
  else reasons.push('confidence-too-low');
  if ((horizon.consensusSpread ?? 1) <= config.maxConsensusSpread) reasons.push('spread-passed');
  else reasons.push('spread-too-wide');
  if (championAgreement) reasons.push('champion-agrees');
  if (regimeChampionAgreement) reasons.push('regime-champion-agrees');

  const gated =
    edge >= config.minEdge &&
    confidence >= config.minHorizonConfidence &&
    (horizon.consensusSpread ?? 1) <= config.maxConsensusSpread &&
    (!config.requireChampionAgreement || championAgreement) &&
    (!config.requireRegimeChampionAgreement || regimeChampionAgreement);

  return {
    label,
    direction: horizon.metaDirection,
    probabilityUp: horizon.metaProbabilityUp,
    edge,
    confidence,
    champion: horizon.champion,
    championDirection,
    championAgreement,
    regimeChampion: horizon.regimeChampion,
    regimeChampionDirection,
    regimeChampionAgreement,
    consensusSpread: horizon.consensusSpread,
    entrants: horizon.entrants,
    metaWeights: horizon.metaWeights,
    gated,
    action: gated ? (horizon.metaDirection === 'up' ? 'long' : 'short') : 'hold',
    reasons
  };
}

export function buildPolicySnapshot(overlay, config = DEFAULT_POLICY_CONFIG) {
  const finalConfig = normalizePolicyConfig(config);
  const horizonPolicies = Object.fromEntries(
    Object.entries(overlay.horizons || {}).map(([label, horizon]) => [label, evaluateHorizonPolicy(label, horizon, finalConfig)])
  );
  const weights = finalConfig.horizonWeights || {};
  const entries = Object.entries(horizonPolicies);
  const totalWeight = entries.reduce((sum, [label]) => sum + (weights[label] ?? 1), 0) || 1;
  const upWeight = entries.filter(([, item]) => item.direction === 'up').reduce((sum, [label]) => sum + (weights[label] ?? 1), 0);
  const downWeight = entries.filter(([, item]) => item.direction === 'down').reduce((sum, [label]) => sum + (weights[label] ?? 1), 0);
  const dominantDirection = upWeight >= downWeight ? 'up' : 'down';
  const dominantWeight = Math.max(upWeight, downWeight);
  const alignedHorizons = entries.filter(([, item]) => item.direction === dominantDirection).length;
  const gatedAligned = entries.filter(([, item]) => item.direction === dominantDirection && item.gated);
  const gatedAlignedWeight = gatedAligned.reduce((sum, [label]) => sum + (weights[label] ?? 1), 0);
  const averageAlignedConfidence = gatedAligned.length
    ? gatedAligned.reduce((sum, [, item]) => sum + item.confidence, 0) / gatedAligned.length
    : 0;
  const consensusWeight = dominantWeight / totalWeight;
  const decisionReasons = [];
  if (consensusWeight >= finalConfig.minConsensusWeight) decisionReasons.push('consensus-weight-passed');
  else decisionReasons.push('consensus-weight-too-low');
  if (alignedHorizons >= finalConfig.minAlignedHorizons) decisionReasons.push('aligned-horizons-passed');
  else decisionReasons.push('not-enough-aligned-horizons');
  if (gatedAligned.length > 0) decisionReasons.push('at-least-one-gated-horizon');
  else decisionReasons.push('no-gated-horizons');
  if (averageAlignedConfidence >= finalConfig.minHorizonConfidence) decisionReasons.push('aligned-confidence-passed');
  else decisionReasons.push('aligned-confidence-too-low');

  const gated =
    consensusWeight >= finalConfig.minConsensusWeight &&
    alignedHorizons >= finalConfig.minAlignedHorizons &&
    gatedAligned.length > 0 &&
    averageAlignedConfidence >= finalConfig.minHorizonConfidence;

  const action = gated ? (dominantDirection === 'up' ? 'long' : 'short') : 'hold';
  return {
    provider: overlay.provider,
    latestRegime: overlay.latestRegime,
    baseTimestamp: overlay.baseTimestamp,
    referenceClose: overlay.referenceClose,
    config: finalConfig,
    horizons: horizonPolicies,
    consensus: {
      dominantDirection,
      action,
      gated,
      upWeight,
      downWeight,
      consensusWeight,
      alignedHorizons,
      gatedAlignedHorizons: gatedAligned.length,
      gatedAlignedWeight,
      averageAlignedConfidence,
      reasons: decisionReasons
    }
  };
}
