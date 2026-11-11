// Synthetic regime-switching price generator.
// Used (a) as a fallback when live history can't be fetched and (b) to augment training with
// extra market regimes (trend up / trend down / mean-reverting / high-vol chop) so the agent
// doesn't overfit a single historical path.

import { createRng, randn } from "./nn";

interface Regime {
  drift: number; // daily drift
  vol: number; // daily vol
  meanRevert: number; // pull toward local anchor (0 = none)
}

const REGIMES: Regime[] = [
  { drift: 0.0012, vol: 0.011, meanRevert: 0 }, // bull trend
  { drift: -0.0010, vol: 0.016, meanRevert: 0 }, // bear trend
  { drift: 0.0, vol: 0.009, meanRevert: 0.08 }, // calm mean-reverting range
  { drift: 0.0, vol: 0.022, meanRevert: 0.04 }, // volatile chop
];

export function generateSyntheticPrices(n: number, seed: number, startPrice = 100): number[] {
  const rng = createRng(seed);
  const prices = [startPrice];
  let regime = Math.floor(rng() * REGIMES.length);
  let left = 30 + Math.floor(rng() * 60);
  let anchor = startPrice;
  for (let i = 1; i < n; i++) {
    if (--left <= 0) {
      regime = Math.floor(rng() * REGIMES.length);
      left = 30 + Math.floor(rng() * 60);
      anchor = prices[i - 1];
    }
    const r = REGIMES[regime];
    const prev = prices[i - 1];
    const pull = r.meanRevert * Math.log(anchor / prev);
    const ret = r.drift + pull + r.vol * randn(rng);
    prices.push(Math.max(0.01, prev * Math.exp(ret)));
  }
  return prices;
}

/** Stable string -> seed hash so each asset gets its own reproducible fallback series. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
