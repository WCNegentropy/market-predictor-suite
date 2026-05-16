export const DEFAULT_HORIZONS = [1, 3, 5];

export function horizonLabel(h) {
  return `${h}p`; // 'p' for periods
}

export function classifyRegime(features = {}) {
  const trend = (features.sma10_50 ?? 0) + (features.ema12_26 ?? 0);
  const volatility = (features.vol10 ?? 0) + (features.atr14 ?? 0);
  const breakout = features.breakout20 ?? 0;
  const momentum = features.streak5 ?? 0;

  let trendState = trend > 0.01 ? 'bull' : trend < -0.01 ? 'bear' : 'sideways';
  let volState = volatility > 0.03 ? 'high-vol' : 'calm';
  let breakoutState = breakout > 0.2 ? 'breakout' : breakout < -0.2 ? 'breakdown' : 'range';

  // Override for extreme short-term spikes/crashes
  if (Math.abs(momentum) > 0.6 && volState === 'high-vol') {
    if (momentum > 0 && breakoutState === 'breakout') return 'spike-up';
    if (momentum < 0 && breakoutState === 'breakdown') return 'crash-down';
  }

  return `${trendState}-${volState}-${breakoutState}`;
}
