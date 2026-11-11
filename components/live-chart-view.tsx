"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Activity, BarChart2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CandlestickChart, { TradeMarker } from "@/components/candlestick-chart";
import { RL_ASSETS } from "@/lib/rl/assets";
import { fetchHistory, Candle } from "@/lib/rl/data-client";
import { loadTradeMemory } from "@/lib/rl/store";
import { cn } from "@/lib/utils";

/** Shared INR formatter used across the chart page */
export function fmtInr(v: number): string {
  if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${v.toFixed(2)}`;
}

export default function LiveChartView() {
  const [selectedId, setSelectedId] = useState(RL_ASSETS[0].id);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [markers, setMarkers] = useState<TradeMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"live" | "synthetic" | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset = RL_ASSETS.find((a) => a.id === selectedId) ?? RL_ASSETS[0];

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchHistory(selectedAsset, force);
        setCandles(result.candles);
        setSource(result.source);
        setLastUpdated(new Date());

        const memory = loadTradeMemory();
        const assetTrades = memory.filter(
          (m) => m.assetId === selectedId && (m.side === "BUY" || m.side === "SELL")
        );
        const candleTs = result.candles.map((c) => c.ts);
        const built: TradeMarker[] = assetTrades
          .map((t) => {
            let closest = candleTs[0];
            let minDiff = Math.abs(t.ts - closest);
            for (const ts of candleTs) {
              const diff = Math.abs(t.ts - ts);
              if (diff < minDiff) { minDiff = diff; closest = ts; }
            }
            return minDiff < 2 * 24 * 3600 * 1000
              ? { ts: closest, side: t.side as "BUY" | "SELL" }
              : null;
          })
          .filter(Boolean) as TradeMarker[];
        setMarkers(built);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [selectedAsset, selectedId]
  );

  useEffect(() => { load(false); }, [load]);

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const changePct = last && prev ? ((last.close - prev.close) / prev.close) * 100 : null;
  const high52 = candles.length ? Math.max(...candles.map((c) => c.high)) : null;
  const low52  = candles.length ? Math.min(...candles.map((c) => c.low))  : null;
  const isPositive = changePct !== null && changePct >= 0;
  const buyCount  = markers.filter((m) => m.side === "BUY").length;
  const sellCount = markers.filter((m) => m.side === "SELL").length;

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark">Live Chart</h1>
            <p className="text-sm text-muted-foreground">
              Daily OHLC candlestick · MA20 · RL agent trade signals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {source && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 text-xs",
                source === "live"
                  ? "border-action-buy/30 text-action-buy bg-action-buy/5"
                  : "border-warning/30 text-warning-foreground bg-warning/10"
              )}
            >
              <Circle className={cn("h-1.5 w-1.5 fill-current", source === "live" ? "text-action-buy" : "text-warning")} />
              {source === "live" ? "Live data" : "Simulated data"}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Asset selector ── */}
      <div className="flex flex-wrap gap-2">
        {RL_ASSETS.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedId(a.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
              a.id === selectedId
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40 hover:bg-accent"
            )}
          >
            {a.name}
            <span className="ml-1.5 text-[10px] opacity-60 uppercase tracking-wide">{a.type}</span>
          </button>
        ))}
      </div>

      {/* ── Stats row ── */}
      {last && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground mb-1">Last Close</div>
              <div className="text-xl font-bold text-dark">{fmtInr(last.close)}</div>
              {changePct !== null && (
                <div className={cn("flex items-center gap-1 text-xs font-medium mt-1", isPositive ? "text-action-buy" : "text-action-sell")}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {isPositive ? "+" : ""}{changePct.toFixed(2)}% today
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground mb-1">Today Open</div>
              <div className="text-xl font-bold text-dark">{fmtInr(last.open)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                H: {fmtInr(last.high)} · L: {fmtInr(last.low)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-action-buy" /> 52W High
              </div>
              <div className="text-xl font-bold text-action-buy">{high52 ? fmtInr(high52) : "—"}</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Activity className="h-3 w-3 text-action-sell" /> 52W Low
              </div>
              <div className="text-xl font-bold text-action-sell">{low52 ? fmtInr(low52) : "—"}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Chart card ── */}
      <Card className="overflow-hidden border-border p-0">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-border bg-background">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{selectedAsset.name} · Daily Candlestick</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {candles.length} bars · MA20 overlay
                {markers.length > 0 && ` · ${buyCount} BUY / ${sellCount} SELL signals from RL agent`}
              </CardDescription>
            </div>
            {loading && candles.length > 0 && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {error ? (
          <div className="bg-destructive/5 border-t border-destructive/20 p-6 text-sm text-destructive">
            {error}
          </div>
        ) : loading && !candles.length ? (
          <div className="h-80 flex items-center justify-center gap-2 text-sm text-muted-foreground" style={{ background: "#0d1117" }}>
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
            <span className="text-slate-400">Loading candles…</span>
          </div>
        ) : (
          <CandlestickChart
            candles={candles}
            markers={markers}
            maPeriod={20}
            maxCandles={120}
            title=""
          />
        )}
      </Card>

      {/* ── Footer ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-muted-foreground">
        <span>
          {markers.length === 0
            ? "No RL trade markers yet — train the agent and run Live Learning to see BUY/SELL signals."
            : `RL agent placed ${buyCount} BUY and ${sellCount} SELL orders on this asset.`}
        </span>
        {lastUpdated && (
          <span className="shrink-0">Updated {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}
