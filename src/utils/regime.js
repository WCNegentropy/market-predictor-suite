export const DEFAULT_HORIZONS = [1, 3, 5];

export function horizonLabel(h) {
  return `${h}d`;
}

export function classifyRegime(features = {}) {
  const trend = (features.sma10_50 ?? 0) + (features.ema12_26 ?? 0);
  const volatility = (features.vol10 ?? 0) + (features.atr14 ?? 0);
  const breakout = features.breakout20 ?? 0;

  const trendState = trend > 0.01 ? 'bull' : trend < -0.01 ? 'bear' : 'sideways';
  const volState = volatility > 0.03 ? 'high-vol' : 'calm';
  const breakoutState = breakout > 0.2 ? 'breakout' : breakout < -0.2 ? 'breakdown' : 'range';

  return `${trendState}-${volState}-${breakoutState}`;
}
