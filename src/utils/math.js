export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = mean(arr.map(v => (v - m) ** 2));
  return Math.sqrt(variance);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

export function dot(weights, features) {
  return Object.entries(features).reduce((sum, [k, v]) => sum + (weights[k] ?? 0) * v, 0);
}
