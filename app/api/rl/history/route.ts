// Server-side historical price proxy for the RL agent (avoids browser CORS limits).
// Crypto: CoinGecko daily closes (INR). Stocks: Yahoo Finance daily closes (NSE).
// If the upstream is unreachable we fall back to a deterministic synthetic series and say so
// in the `source` field so the UI never presents fake data as real.

import { NextResponse } from "next/server";
import { generateSyntheticPrices, hashSeed } from "@/lib/rl/synthetic-data";

export const dynamic = "force-dynamic";

const ID_RE = /^[A-Za-z0-9._-]{1,40}$/;

async function fetchCrypto(id: string) {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=inr&days=365&interval=daily`;
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const rows: [number, number][] = data?.prices ?? [];
  const clean = rows.filter((r) => Number.isFinite(r[1]) && r[1] > 0);
  const timestamps = clean.map((r) => r[0]);
  const prices = clean.map((r) => r[1]);
  // CoinGecko free tier only gives daily closes — approximate OHLC from adjacent closes
  const opens = prices.map((p, i) => (i === 0 ? p : prices[i - 1]));
  const highs = prices.map((p, i) => Math.max(p, opens[i]) * (1 + 0.004));
  const lows  = prices.map((p, i) => Math.min(p, opens[i]) * (1 - 0.004));
  return { timestamps, prices, opens, highs, lows };
}

async function fetchStock(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.NS?range=5y&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const data = await res.json();
  const r = data?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0] ?? {};
  const rawOpen: (number | null)[] = q.open ?? [];
  const rawHigh: (number | null)[] = q.high ?? [];
  const rawLow: (number | null)[] = q.low ?? [];
  const rawClose: (number | null)[] = q.close ?? [];
  const timestamps: number[] = [];
  const prices: number[] = [];
  const opens: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = rawOpen[i], h = rawHigh[i], l = rawLow[i], c = rawClose[i];
    if (typeof c === "number" && Number.isFinite(c) && c > 0) {
      timestamps.push(ts[i] * 1000);
      prices.push(c);
      opens.push(typeof o === "number" && Number.isFinite(o) ? o : c);
      highs.push(typeof h === "number" && Number.isFinite(h) ? h : c);
      lows.push(typeof l === "number" && Number.isFinite(l) ? l : c);
    }
  }
  return { timestamps, prices, opens, highs, lows };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const type = searchParams.get("type") === "stock" ? "stock" : "crypto";

  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
  }

  try {
    const { prices, timestamps, opens, highs, lows } = type === "crypto" ? await fetchCrypto(id) : await fetchStock(id);
    if (prices.length < 150) throw new Error(`Only ${prices.length} bars returned`);
    return NextResponse.json({ id, type, source: "live", prices, timestamps, opens, highs, lows });
  } catch (err) {
    const n = 800;
    const prices = generateSyntheticPrices(n, hashSeed(id), type === "crypto" ? 1000000 : 1500);
    const opens = prices.map((p, i) => (i === 0 ? p : prices[i - 1]));
    const highs = prices.map((p, i) => Math.max(p, opens[i]) * 1.004);
    const lows  = prices.map((p, i) => Math.min(p, opens[i]) * 0.996);
    const day = 86400000;
    const end = Date.now();
    const timestamps = prices.map((_, i) => end - (n - 1 - i) * day);
    return NextResponse.json({
      id,
      type,
      source: "synthetic",
      reason: err instanceof Error ? err.message : "unknown error",
      prices,
      timestamps,
      opens,
      highs,
      lows,
    });
  }
}
