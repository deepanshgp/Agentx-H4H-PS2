// Browser-side helper to load historical prices from the /api/rl/history route.

import type { PriceSeries } from "./environment";
import type { RLAsset } from "./assets";

export interface HistoryResult {
  series: PriceSeries;
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
  const value: HistoryResult = {
    series: { prices: data.prices, timestamps: data.timestamps, label: asset.name },
    source: data.source,
    reason: data.reason,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
