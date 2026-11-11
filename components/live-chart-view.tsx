"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, Activity, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CandlestickChart, { TradeMarker } from "@/components/candlestick-chart";
import { RL_ASSETS } from "@/lib/rl/assets";
import { fetchHistory, Candle } from "@/lib/rl/data-client";
import { loadTradeMemory } from "@/lib/rl/store";

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

        // Pull trade markers from the RL agent's stored memory
        const memory = loadTradeMemory();
        const assetTrades = memory.filter(
          (m) => m.assetId === selectedId && (m.side === "BUY" || m.side === "SELL")
        );

        // Map each trade to the nearest candle timestamp
        const candleTs = result.candles.map((c) => c.ts);
        const built: TradeMarker[] = assetTrades
          .map((t) => {
            // find the closest candle timestamp
            let closest = candleTs[0];
            let minDiff = Math.abs(t.ts - closest);
            for (const ts of candleTs) {
              const diff = Math.abs(t.ts - ts);
              if (diff < minDiff) { minDiff = diff; closest = ts; }
            }
            // only attach if within 2 days (avoid stale markers on old candles)
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

  // load on mount and on asset change
  useEffect(() => { load(false); }, [load]);

  const asset = selectedAsset;

  // summary stats from candles
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const changePct = last && prev ? ((last.close - prev.close) / prev.close) * 100 : null;
  const high52 = candles.length ? Math.max(...candles.map((c) => c.high)) : null;
  const low52  = candles.length ? Math.min(...candles.map((c) => c.low))  : null;

  const inr = (v: number) =>
    v >= 1_000_000
      ? `₹${(v / 1_000_000).toFixed(2)}M`
      : v >= 1_000
      ? `₹${(v / 1_000).toFixed(1)}k`
      : `₹${v.toFixed(2)}`;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="h-6 w-6 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold">Live Chart</h1>
            <p className="text-sm text-muted-foreground">
              Daily OHLC candlestick chart with RL agent trade markers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {source && (
            <Badge variant={source === "live" ? "default" : "secondary"}>
              {source === "live" ? "Live data" : "Synthetic data"}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              a.id === selectedId
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {a.name}
            <span className="ml-1.5 text-xs opacity-60">{a.type}</span>
          </button>
        ))}
      </div>

      {/* ── Stats row ── */}
      {last && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Last Close</div>
              <div className="text-xl font-bold">{inr(last.close)}</div>
              {changePct !== null && (
                <div className={`text-xs font-medium mt-0.5 ${changePct >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}% today
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Today Open</div>
              <div className="text-xl font-bold">{inr(last.open)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" /> 52W High
              </div>
              <div className="text-xl font-bold text-green-600">{high52 ? inr(high52) : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3 text-red-500" /> 52W Low
              </div>
              <div className="text-xl font-bold text-red-600">{low52 ? inr(low52) : "—"}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Chart ── */}
      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : loading && !candles.length ? (
        <div
          className="rounded-xl flex items-center justify-center text-sm text-gray-400 h-64"
          style={{ background: "#0d1117" }}
        >
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading candles…
        </div>
      ) : (
        <CandlestickChart
          candles={candles}
          markers={markers}
          maPeriod={20}
          maxCandles={120}
          title={`${asset.name} · Daily`}
          className="shadow-lg"
        />
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {candles.length} daily candles · MA20 overlay ·{" "}
          {markers.length > 0
            ? `${markers.filter((m) => m.side === "BUY").length} BUY / ${markers.filter((m) => m.side === "SELL").length} SELL markers from RL agent`
            : "No RL trade markers yet — train and run the agent to see trades"}
        </span>
        {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
