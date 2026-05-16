function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export const DEFAULT_RISK_CONFIG = {
  maxRiskFraction: 0.01,
  minExposure: 0.1,
  maxExposure: 1,
  baseStopPct: 0.025,
  baseTakeProfitMultiple: 1.8,
  trailingStopPct: 0.018,
  minRewardToRisk: 1.5,
  requireAllGatedAligned: false,
  blockOnWideConsensusSpread: true,
  maxAverageConsensusSpread: 0.42
};

export function normalizeRiskConfig(config = {}) {
  return {
    ...DEFAULT_RISK_CONFIG,
    ...config
  };
}

function riskReasons(policy, config) {
  const reasons = [];
  if (policy.consensus.action === 'hold') reasons.push('policy-hold');
  if ((policy.consensus.gatedAlignedHorizons ?? 0) === 0) reasons.push('no-gated-aligned-horizons');
  if ((policy.consensus.averageAlignedConfidence ?? 0) < (policy.config?.minHorizonConfidence ?? 0.55)) reasons.push('aligned-confidence-below-threshold');
  const avgSpread = Object.values(policy.horizons || {}).length
    ? Object.values(policy.horizons).reduce((sum, item) => sum + (item.consensusSpread ?? 0), 0) / Object.values(policy.horizons).length
    : 1;
  if (config.blockOnWideConsensusSpread && avgSpread > config.maxAverageConsensusSpread) reasons.push('average-consensus-spread-too-wide');
  if (config.requireAllGatedAligned) {
    const gated = Object.values(policy.horizons || {}).filter(item => item.gated);
    const allAligned = gated.length > 0 && gated.every(item => item.direction === policy.consensus.dominantDirection);
    if (!allAligned) reasons.push('not-all-gated-horizons-aligned');
  }
  return { reasons, averageConsensusSpread: avgSpread };
}

function directionMultipliers(direction) {
  return direction === 'long' ? { stopSign: -1, takeProfitSign: 1 } : { stopSign: 1, takeProfitSign: -1 };
}

function computeExposure(policy, config) {
  const confidence = clamp(policy.consensus.averageAlignedConfidence ?? 0, 0, 1);
  const consensusWeight = clamp(policy.consensus.consensusWeight ?? 0, 0, 1);
  const gatedShare = clamp((policy.consensus.gatedAlignedWeight ?? 0) / Math.max(policy.consensus.upWeight + policy.consensus.downWeight, 1e-9), 0, 1);
  const quality = clamp(confidence * 0.5 + consensusWeight * 0.3 + gatedShare * 0.2, 0, 1);
  if (quality <= 0) return 0;
  const scaled = config.minExposure + (config.maxExposure - config.minExposure) * quality;
  return clamp(scaled, 0, config.maxExposure);
}

export function buildRiskSnapshot(policy, config = {}) {
  const finalConfig = normalizeRiskConfig(config);
  const { reasons: noTradeConditions, averageConsensusSpread } = riskReasons(policy, finalConfig);
  const action = policy.consensus.action;
  const tradeAllowed = action !== 'hold' && noTradeConditions.length === 0;
  const exposureFraction = tradeAllowed ? computeExposure(policy, finalConfig) : 0;
  const confidence = clamp(policy.consensus.averageAlignedConfidence ?? 0, 0, 1);
  const stopPct = clamp(finalConfig.baseStopPct * (1 - confidence * 0.35), 0.005, 0.2);
  const takeProfitPct = clamp(stopPct * finalConfig.baseTakeProfitMultiple * (1 + confidence * 0.5), stopPct, 0.5);
  const rewardToRisk = stopPct > 0 ? takeProfitPct / stopPct : 0;
  if (rewardToRisk < finalConfig.minRewardToRisk) noTradeConditions.push('reward-to-risk-too-low');
  const allowedAfterRewardCheck = tradeAllowed && rewardToRisk >= finalConfig.minRewardToRisk;
  const finalExposureFraction = allowedAfterRewardCheck ? exposureFraction : 0;
  const finalAction = allowedAfterRewardCheck ? action : 'hold';
  const price = policy.referenceClose;
  const { stopSign, takeProfitSign } = directionMultipliers(finalAction);
  const stopPrice = finalAction === 'hold' ? null : price * (1 + stopSign * stopPct);
  const takeProfitPrice = finalAction === 'hold' ? null : price * (1 + takeProfitSign * takeProfitPct);
  const trailingStopPrice = finalAction === 'hold' ? null : price * (1 + stopSign * finalConfig.trailingStopPct);
  const positionRiskFraction = finalExposureFraction * finalConfig.maxRiskFraction;

  return {
    provider: policy.provider,
    latestRegime: policy.latestRegime,
    baseTimestamp: policy.baseTimestamp,
    referenceClose: policy.referenceClose,
    policy,
    config: finalConfig,
    action: finalAction,
    tradeAllowed: allowedAfterRewardCheck,
    noTradeConditions,
    position: {
      direction: finalAction,
      exposureFraction: finalExposureFraction,
      maxRiskFraction: finalConfig.maxRiskFraction,
      positionRiskFraction,
      sizingNote: finalAction === 'hold' ? 'No position recommended under current gating and risk rules.' : 'Exposure fraction is normalized 0-1 against configured max exposure.'
    },
    risk: {
      averageConsensusSpread,
      averageAlignedConfidence: policy.consensus.averageAlignedConfidence,
      consensusWeight: policy.consensus.consensusWeight,
      rewardToRisk,
      stopLossPct: finalAction === 'hold' ? null : stopPct,
      stopLossPrice: stopPrice,
      takeProfitPct: finalAction === 'hold' ? null : takeProfitPct,
      takeProfitPrice,
      trailingStopPct: finalAction === 'hold' ? null : finalConfig.trailingStopPct,
      trailingStopPrice
    }
  };
}
