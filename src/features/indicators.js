import { mean, std } from '../utils/math.js';
import { classifyRegime, DEFAULT_HORIZONS, horizonLabel } from '../utils/regime.js';

function closes(bars, idx, period) {
  const start = Math.max(0, idx - period + 1);
  return bars.slice(start, idx + 1).map(b => b.close);
}

function highs(bars, idx, period) {
  const start = Math.max(0, idx - period + 1);
  return bars.slice(start, idx + 1).map(b => b.high ?? b.close);
}

function lows(bars, idx, period) {
  const start = Math.max(0, idx - period + 1);
  return bars.slice(start, idx + 1).map(b => b.low ?? b.close);
}

function sma(bars, idx, period) {
  const values = closes(bars, idx, period);
  return values.length ? mean(values) : null;
}

function emaAt(bars, idx, period) {
  const alpha = 2 / (period + 1);
  const start = Math.max(0, idx - period * 4);
  let ema = bars[start].close;
  for (let i = start + 1; i <= idx; i++) ema = alpha * bars[i].close + (1 - alpha) * ema;
  return ema;
}

function pctChange(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return 0;
  return (b - a) / a;
}

function rsi(bars, idx, period = 14) {
  if (idx < 1) return 50;
  const start = Math.max(1, idx - period + 1);
  let gains = 0;
  let losses = 0;
  for (let i = start; i <= idx; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function stochasticK(bars, idx, period = 14) {
  const high = Math.max(...highs(bars, idx, period));
  const low = Math.min(...lows(bars, idx, period));
  const close = bars[idx].close;
  if (!Number.isFinite(high) || !Number.isFinite(low) || high === low) return 50;
  return ((close - low) / (high - low)) * 100;
}

function atrPercent(bars, idx, period = 14) {
  const start = Math.max(1, idx - period + 1);
  const trs = [];
  for (let i = start; i <= idx; i++) {
    const high = bars[i].high ?? bars[i].close;
    const low = bars[i].low ?? bars[i].close;
    const prevClose = bars[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const close = bars[idx].close;
  return close ? mean(trs) / close : 0;
}

function computeStreak(bars, idx, maxLookback = 5) {
  let streak = 0;
  for (let i = idx; i > Math.max(0, idx - maxLookback); i--) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff > 0 && streak >= 0) streak += 1;
    else if (diff < 0 && streak <= 0) streak -= 1;
    else break;
  }
  return streak / maxLookback;
}

function computeFeaturePoint(bars, idx) {
  const c = bars[idx].close;
  const c1 = bars[idx - 1]?.close ?? c;
  const c3 = bars[idx - 3]?.close ?? c1;
  const c5 = bars[idx - 5]?.close ?? c1;
  const c10 = bars[idx - 10]?.close ?? c1;
  const sma5 = sma(bars, idx, 5) ?? c;
  const sma10 = sma(bars, idx, 10) ?? c;
  const sma20 = sma(bars, idx, 20) ?? c;
  const sma50 = sma(bars, idx, 50) ?? c;
  const ema12 = emaAt(bars, idx, 12);
  const ema26 = emaAt(bars, idx, 26);
  const macd = ema26 ? (ema12 - ema26) / ema26 : 0;
  const macdSignalApprox = ((emaAt(bars, idx, 9) - ema26) / (ema26 || c || 1));
  const returns10 = [];
  for (let j = Math.max(1, idx - 9); j <= idx; j++) returns10.push(pctChange(bars[j - 1].close, bars[j].close));
  const volumes = bars.slice(Math.max(0, idx - 19), idx + 1).map(b => b.volume ?? 0);
  const volumeMean = mean(volumes);
  const volumeStd = std(volumes);
  const close20 = closes(bars, idx, 20);
  const closeStd20 = std(close20);
  const highest20 = Math.max(...highs(bars, idx, 20));
  const lowest20 = Math.min(...lows(bars, idx, 20));
  const range10High = Math.max(...highs(bars, idx, 10));
  const range10Low = Math.min(...lows(bars, idx, 10));
  const features = {
    mom1: pctChange(c1, c),
    mom3: pctChange(c3, c),
    mom5: pctChange(c5, c),
    mom10: pctChange(c10, c),
    sma5_20: sma20 ? (sma5 - sma20) / sma20 : 0,
    sma10_50: sma50 ? (sma10 - sma50) / sma50 : 0,
    ema12_26: macd,
    macdSignalGap: macd - macdSignalApprox,
    rsi14: (rsi(bars, idx, 14) - 50) / 50,
    stoch14: (stochasticK(bars, idx, 14) - 50) / 50,
    vol10: std(returns10),
    atr14: atrPercent(bars, idx, 14),
    bollingerZ20: closeStd20 ? (c - sma20) / (2 * closeStd20) : 0,
    breakout20: highest20 !== lowest20 ? ((c - lowest20) / (highest20 - lowest20)) - 0.5 : 0,
    rangeCompression10: c ? (range10High - range10Low) / c : 0,
    volZ: volumeStd ? ((bars[idx].volume ?? volumeMean) - volumeMean) / volumeStd : 0,
    volumeTrend5: volumeMean ? ((mean(volumes.slice(-5)) - volumeMean) / volumeMean) : 0,
    meanRev20: sma20 ? (c - sma20) / sma20 : 0,
    streak5: computeStreak(bars, idx, 5)
  };
  return {
    timestamp: bars[idx].timestamp,
    close: c,
    features,
    regime: classifyRegime(features)
  };
}

export function buildDataset(bars, horizons = DEFAULT_HORIZONS) {
  const trainingRowsByHorizon = Object.fromEntries(horizons.map(h => [horizonLabel(h), []]));
  let latestFeature = null;
  if (bars.length < 90) return { trainingRowsByHorizon, latestFeature, horizons: horizons.map(horizonLabel) };
  const maxHorizon = Math.max(...horizons);
  for (let i = 60; i < bars.length; i++) {
    const point = computeFeaturePoint(bars, i);
    if (i <= bars.length - 1 - maxHorizon) {
      for (const h of horizons) {
        const futureBar = bars[i + h];
        const label = horizonLabel(h);
        trainingRowsByHorizon[label].push({
          timestamp: point.timestamp,
          close: point.close,
          horizonDays: h,
          nextTimestamp: futureBar.timestamp,
          nextClose: futureBar.close,
          target: futureBar.close > point.close ? 1 : 0,
          features: point.features,
          regime: point.regime
        });
      }
    } else {
      latestFeature = point;
    }
  }
  return {
    trainingRowsByHorizon,
    latestFeature,
    horizons: horizons.map(horizonLabel)
  };
}
