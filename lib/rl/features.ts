// Feature engineering for the RL trading agent.
// Market features depend only on the price history up to (and including) bar t — no look-ahead.

export const WARMUP = 60; // bars of history required before features are valid
export const N_MARKET_FEATURES = 10;
export const N_POSITION_FEATURES = 4;
export const N_FEATURES = N_MARKET_FEATURES + N_POSITION_FEATURES;

export const FEATURE_NAMES = [
  "ret1", "ret3", "ret5", "ret10", "ret20",
  "volRatio", "rsi14", "trend20", "macd", "bollinger",
  "exposure", "unrealizedPnl", "barsHeld", "drawdown",
];

const clip = (x: number, lim: number) => (Number.isFinite(x) ? Math.max(-lim, Math.min(lim, x)) : 0);

function stdev(arr: number[], from: number, to: number): number {
  const n = to - from;
  if (n < 2) return 0;
  let m = 0;
  for (let i = from; i < to; i++) m += arr[i];
  m /= n;
  let v = 0;
  for (let i = from; i < to; i++) v += (arr[i] - m) ** 2;
  return Math.sqrt(v / (n - 1));
}

/** Compute market features for a single bar t. Requires t >= WARMUP. */
export function marketFeaturesAt(prices: number[], t: number): number[] {
  const p = prices[t];
  // 1-bar log returns up to t
  const rets: number[] = [];
  for (let i = t - 59; i <= t; i++) rets.push(Math.log(prices[i] / prices[i - 1]));
  const sigma20 = stdev(rets, 40, 60) || 1e-4;
  const sigma60 = stdev(rets, 0, 60) || 1e-4;

  const kRet = (k: number) => clip(Math.log(p / prices[t - k]) / (sigma20 * Math.sqrt(k)), 3);

  // RSI(14)
  let gain = 0,
    loss = 0;
  for (let i = t - 13; i <= t; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  const rsi = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);

  // SMA20 / Bollinger
  let sma20 = 0;
  for (let i = t - 19; i <= t; i++) sma20 += prices[i];
  sma20 /= 20;
  let sd20 = 0;
  for (let i = t - 19; i <= t; i++) sd20 += (prices[i] - sma20) ** 2;
  sd20 = Math.sqrt(sd20 / 20) || 1e-9;

  // MACD (12/26 EMA difference) computed over the last 60 bars for stability
  const ema = (period: number) => {
    const a = 2 / (period + 1);
    let e = prices[t - 59];
    for (let i = t - 58; i <= t; i++) e = a * prices[i] + (1 - a) * e;
    return e;
  };
  const macd = (ema(12) - ema(26)) / p;

  return [
    kRet(1),
    kRet(3),
    kRet(5),
    kRet(10),
    kRet(20),
    clip(sigma20 / sigma60 - 1, 2),
    (rsi - 50) / 50,
    clip((p / sma20 - 1) / (sigma20 * Math.sqrt(20)), 3),
    clip(macd / (sigma20 * Math.sqrt(10)), 3),
    clip((p - sma20) / (2 * sd20), 2),
  ];
}

/** Pre-compute market features for every valid bar. Index i corresponds to price index i (null before WARMUP). */
export function precomputeMarketFeatures(prices: number[]): (number[] | null)[] {
  const out: (number[] | null)[] = new Array(prices.length).fill(null);
  for (let t = WARMUP; t < prices.length; t++) out[t] = marketFeaturesAt(prices, t);
  return out;
}

export interface PositionView {
  exposure: number; // fraction of equity currently invested (0..1)
  unrealizedPct: number; // open-position PnL as a fraction (0.05 = +5%)
  barsHeld: number;
  drawdown: number; // current equity drawdown from peak (fraction)
}

export function positionFeatures(v: PositionView): number[] {
  return [
    clip(v.exposure, 1),
    clip(v.unrealizedPct * 10, 3),
    clip(v.barsHeld / 50, 2),
    clip(v.drawdown * 10, 3),
  ];
}

export function buildObservation(market: number[], pos: PositionView): number[] {
  return market.concat(positionFeatures(pos));
}
