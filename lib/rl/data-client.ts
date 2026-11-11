// Browser-side helper to load historical prices from the /api/rl/history route.

import type { PriceSeries } from "./environment";
import type { RLAsset } from "./assets";

export interface Candle {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface HistoryResult {
  series: PriceSeries;
  candles: Candle[];
  source: "live" | "synthetic";
  reason?: string;
}

const cache = new Map<string, { at: number; value: HistoryResult }>();
const TTL_MS = 5 * 60 * 1000;

export async function fetchHistory(asset: RLAsset, force = false): Promise<HistoryResult> {
  const key = asset.id;
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const res = await fetch(`/api/rl/history?id=${encodeURIComponent(asset.id)}&type=${asset.type}`);
  if (!res.ok) throw new Error(`History request failed (${res.status})`);
  const data = await res.json();

  const prices: number[] = data.prices;
  const timestamps: number[] = data.timestamps;
  const opens: number[] = data.opens ?? prices;
  const highs: number[] = data.highs ?? prices;
  const lows: number[]  = data.lows  ?? prices;

  const candles: Candle[] = prices.map((close, i) => ({
    ts:    timestamps[i],
    open:  opens[i]  ?? close,
    high:  highs[i]  ?? close,
    low:   lows[i]   ?? close,
    close,
  }));

  const value: HistoryResult = {
    series: { prices, timestamps, label: asset.name },
    candles,
    source: data.source,
    reason: data.reason,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
