import { sigmoid } from '../utils/math.js';

export function heuristicScore(features) {
  return (
    features.mom1 * 0.55 +
    features.mom3 * 0.8 +
    features.mom5 * 1.0 +
    features.mom10 * 0.75 +
    features.sma5_20 * 1.1 +
    features.sma10_50 * 0.95 +
    features.ema12_26 * 0.9 +
    features.macdSignalGap * 0.65 +
    features.rsi14 * 0.3 +
    features.stoch14 * 0.25 -
    features.vol10 * 1.0 -
    features.atr14 * 0.7 +
    features.bollingerZ20 * 0.35 +
    features.breakout20 * 0.55 -
    features.rangeCompression10 * 0.25 +
    features.volZ * 0.08 +
    features.volumeTrend5 * 0.15 -
    features.meanRev20 * 0.3 +
    features.streak5 * 0.2
  );
}

export function predictHeuristicProbability(features) {
  return sigmoid(heuristicScore(features) * 2.1);
}
