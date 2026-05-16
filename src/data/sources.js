import { getJson, getText } from '../utils/http.js';

function normalizeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeStockSymbol(symbol) {
  return symbol.trim().toUpperCase();
}

function normalizeStooqSymbol(symbol) {
  const cleaned = symbol.trim().toLowerCase().replace(/[^a-z0-9.]/g, '');
  return cleaned.includes('.') ? cleaned : `${cleaned}.us`;
}

function normalizeCryptoPair(symbol) {
  const cleaned = symbol.trim().toUpperCase().replace(/[^A-Z]/g, '');
  const quoteCandidates = ['USDT', 'USD', 'EUR', 'GBP'];
  for (const quote of quoteCandidates) {
    if (cleaned.endsWith(quote) && cleaned.length > quote.length) {
      return { base: cleaned.slice(0, -quote.length), quote };
    }
  }
  return { base: cleaned.slice(0, 3), quote: cleaned.slice(3) || 'USD' };
}

function rangeForLookback(lookback) {
  if (lookback <= 100) return '6mo';
  if (lookback <= 250) return '1y';
  if (lookback <= 500) return '2y';
  if (lookback <= 1250) return '5y';
  return '10y';
}

async function fetchStocksYahoo(symbol, lookback, interval = '1d') {
  const normalized = normalizeStockSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized)}?interval=${interval}&range=${rangeForLookback(lookback)}&includePrePost=false&events=div%2Csplits`;
  const json = await getJson(url, { 'User-Agent': 'market-predictor-suite' });
  const result = json?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result || !quote || !Array.isArray(result.timestamp)) throw new Error('Yahoo chart payload missing expected fields');
  const bars = result.timestamp.map((ts, i) => ({
    timestamp: new Date(ts * 1000).toISOString(),
    open: normalizeNumber(quote.open?.[i]),
    high: normalizeNumber(quote.high?.[i]),
    low: normalizeNumber(quote.low?.[i]),
    close: normalizeNumber(quote.close?.[i]),
    volume: normalizeNumber(quote.volume?.[i])
  })).filter(row => row.close !== null).slice(-lookback);
  if (bars.length < Math.min(60, lookback)) throw new Error('Yahoo returned insufficient bars');
  return { provider: 'yahoo-chart', bars };
}

async function fetchStocksStooq(symbol, lookback) {
  const normalized = normalizeStooqSymbol(symbol);
  const url = `https://stooq.com/q/d/l/?s=${normalized}&i=d`;
  const text = await getText(url, { 'User-Agent': 'market-predictor-suite' });
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 3) throw new Error('Stooq returned insufficient CSV rows');
  const rows = lines.slice(1).map(line => line.split(','));
  const bars = rows.map(([date, open, high, low, close, volume]) => ({
    timestamp: `${date}T00:00:00.000Z`,
    open: normalizeNumber(open),
    high: normalizeNumber(high),
    low: normalizeNumber(low),
    close: normalizeNumber(close),
    volume: normalizeNumber(volume)
  })).filter(row => row.close !== null).slice(-lookback);
  if (bars.length < Math.min(60, lookback)) throw new Error('Stooq returned insufficient bars');
  return { provider: 'stooq', bars };
}

async function fetchCryptoCryptoCompare(symbol, lookback, interval = '1d') {
  const { base, quote } = normalizeCryptoPair(symbol);
  const limit = Math.min(Math.max(lookback, 60), 2000);
  
  let endpoint = 'histoday';
  if (interval.endsWith('h')) endpoint = 'histohour';
  if (interval.endsWith('m')) endpoint = 'histominute';
  
  const aggregate = parseInt(interval) || 1;
  const url = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${base}&tsym=${quote}&limit=${limit}&aggregate=${aggregate}`;
  const json = await getJson(url, { 'User-Agent': 'market-predictor-suite' });
  const rows = json?.Data?.Data;
  if (!Array.isArray(rows)) throw new Error('CryptoCompare payload missing rows');
  const bars = rows.map(row => ({
    timestamp: new Date(row.time * 1000).toISOString(),
    open: normalizeNumber(row.open),
    high: normalizeNumber(row.high),
    low: normalizeNumber(row.low),
    close: normalizeNumber(row.close),
    volume: normalizeNumber(row.volumefrom ?? row.volumeto)
  })).filter(row => row.close !== null).slice(-lookback);
  if (bars.length < Math.min(60, lookback)) throw new Error('CryptoCompare returned insufficient bars');
  return { provider: 'cryptocompare', bars };
}

async function fetchCryptoCoinbase(symbol, lookback) {
  const { base, quote } = normalizeCryptoPair(symbol);
  const productId = `${base}-${quote}`;
  const end = new Date();
  const start = new Date(Date.now() - Math.min(lookback, 299) * 86400 * 1000);
  const url = `https://api.exchange.coinbase.com/products/${productId}/candles?granularity=86400&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
  const json = await getJson(url, { 'User-Agent': 'market-predictor-suite' });
  if (!Array.isArray(json)) throw new Error('Coinbase payload missing rows');
  const bars = json.map(([time, low, high, open, close, volume]) => ({
    timestamp: new Date(time * 1000).toISOString(),
    open: normalizeNumber(open),
    high: normalizeNumber(high),
    low: normalizeNumber(low),
    close: normalizeNumber(close),
    volume: normalizeNumber(volume)
  })).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).filter(row => row.close !== null).slice(-lookback);
  if (bars.length < Math.min(60, lookback)) throw new Error('Coinbase returned insufficient bars');
  return { provider: 'coinbase', bars };
}

export async function fetchBars({ asset, symbol, lookback, interval = '1d' }) {
  const providers = asset === 'stocks'
    ? [fetchStocksYahoo, fetchStocksStooq]
    : asset === 'crypto'
      ? [fetchCryptoCryptoCompare, fetchCryptoCoinbase]
      : [];
  if (!providers.length) throw new Error(`Unsupported asset type: ${asset}`);
  const errors = [];
  for (const provider of providers) {
    try {
      return await provider(symbol, lookback, interval);
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }
  throw new Error(`All providers failed for ${asset}/${symbol}: ${errors.join(' | ')}`);
}
