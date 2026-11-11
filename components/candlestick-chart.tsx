"use client";

/**
 * CandlestickChart
 * Dark-theme candlestick chart rendered as a pure SVG — no extra libraries.
 * Features:
 *   • Green (bullish) / Red (bearish) OHLC candles with wicks
 *   • Blue moving-average line overlay (configurable period, default 20)
 *   • Green ▲ BUY  and  Red ▼ SELL trade markers above/below candles
 *   • Animated entry — candles fade in on mount
 *   • Responsive via viewBox scaling
 *   • Hover tooltip showing OHLC + date
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { Candle } from "@/lib/rl/data-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TradeMarker {
  ts: number;         // must match a candle.ts exactly
  side: "BUY" | "SELL";
}

export interface CandlestickChartProps {
  candles: Candle[];
  /** Trade markers to overlay */
  markers?: TradeMarker[];
  /** Moving-average period (0 = hide) */
  maPeriod?: number;
  /** Max candles to display (most recent N) */
  maxCandles?: number;
  /** Chart title shown top-left */
  title?: string;
  className?: string;
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const BG        = "#0d1117";
const GRID      = "#1e2733";
const BULL      = "#00c896";   // green candle
const BEAR      = "#ff4d4d";   // red candle
const WICK      = "#6b7280";
const MA_COLOR  = "#60a5fa";   // blue MA line
const LABEL_CLR = "#6b7280";
const TOOLTIP_BG = "#1a2233";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += values[j];
    return s / period;
  });
}

function formatPrice(v: number): string {
  if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${v.toFixed(2)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

// ─── Component ───────────────────────────────────────────────────────────────

const W = 900;    // viewBox width
const H = 420;    // viewBox height
const PAD = { top: 24, right: 16, bottom: 36, left: 72 };

export default function CandlestickChart({
  candles,
  markers = [],
  maPeriod = 20,
  maxCandles = 80,
  title,
  className = "",
}: CandlestickChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; candle: Candle;
  } | null>(null);

  // Slice to the most recent N candles
  const visible = useMemo(
    () => candles.slice(-maxCandles),
    [candles, maxCandles]
  );

  const closes = useMemo(() => visible.map((c) => c.close), [visible]);
  const maLine = useMemo(
    () => (maPeriod > 0 ? sma(closes, maPeriod) : []),
    [closes, maPeriod]
  );

  // Build a ts→index map for trade markers
  const markerMap = useMemo(() => {
    const m = new Map<number, "BUY" | "SELL">();
    for (const mk of markers) m.set(mk.ts, mk.side);
    return m;
  }, [markers]);

  // ── Layout ────────────────────────────────────────────────────────────────

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const allPrices = visible.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;
  const pad5 = range * 0.08;
  const yMin = minP - pad5;
  const yMax = maxP + pad5;

  const toY = useCallback(
    (price: number) => PAD.top + plotH * (1 - (price - yMin) / (yMax - yMin)),
    [plotH, yMin, yMax]
  );

  const n = visible.length;
  const candleW = Math.max(3, Math.floor(plotW / Math.max(n, 1)) - 2);
  const candleX = (i: number) =>
    PAD.left + (i / Math.max(n - 1, 1)) * plotW;

  // ── Y-axis ticks ─────────────────────────────────────────────────────────

  const yTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const price = yMin + ((yMax - yMin) * i) / (count - 1);
      return { price, y: toY(price) };
    });
  }, [yMin, yMax, toY]);

  // ── X-axis ticks (every ~10 candles) ─────────────────────────────────────

  const xTicks = useMemo(() => {
    const step = Math.max(1, Math.floor(n / 6));
    const ticks: { i: number; label: string }[] = [];
    for (let i = 0; i < n; i += step) {
      ticks.push({ i, label: formatDate(visible[i].ts) });
    }
    return ticks;
  }, [n, visible]);

  // ── MA line path ─────────────────────────────────────────────────────────

  const maPath = useMemo(() => {
    if (!maLine.length) return "";
    let d = "";
    maLine.forEach((v, i) => {
      if (v === null) return;
      const x = candleX(i);
      const y = toY(v);
      d += d === "" ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    return d;
  }, [maLine, candleX, toY]);

  // ── Tooltip handler ───────────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !n) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * W;
      const relX = svgX - PAD.left;
      const idx = Math.round((relX / plotW) * (n - 1));
      const clamped = Math.max(0, Math.min(n - 1, idx));
      const candle = visible[clamped];
      setTooltip({ x: candleX(clamped), y: toY(candle.close), candle });
    },
    [n, plotW, visible, candleX, toY]
  );

  if (!visible.length) {
    return (
      <div
        className={`rounded-xl flex items-center justify-center text-sm text-gray-500 ${className}`}
        style={{ background: BG, minHeight: 240 }}
      >
        No candle data yet — run a few cycles.
      </div>
    );
  }

  const TW = 180; // tooltip box width
  const TH = 112;

  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ background: BG }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* ── Background ── */}
        <rect width={W} height={H} fill={BG} />

        {/* ── Grid lines ── */}
        {yTicks.map((t, i) => (
          <line
            key={i}
            x1={PAD.left} y1={t.y}
            x2={W - PAD.right} y2={t.y}
            stroke={GRID} strokeWidth={1}
          />
        ))}

        {/* ── Y-axis labels ── */}
        {yTicks.map((t, i) => (
          <text
            key={i}
            x={PAD.left - 6} y={t.y + 4}
            textAnchor="end"
            fontSize={11} fill={LABEL_CLR}
          >
            {formatPrice(t.price)}
          </text>
        ))}

        {/* ── X-axis labels ── */}
        {xTicks.map(({ i, label }) => (
          <text
            key={i}
            x={candleX(i)} y={H - PAD.bottom + 16}
            textAnchor="middle"
            fontSize={10} fill={LABEL_CLR}
          >
            {label}
          </text>
        ))}

        {/* ── Title ── */}
        {title && (
          <text x={PAD.left} y={14} fontSize={12} fill="#94a3b8" fontWeight={600}>
            {title}
          </text>
        )}

        {/* ── Candles ── */}
        <g style={{ animation: "fadeIn .4s ease" }}>
          {visible.map((c, i) => {
            const x  = candleX(i);
            const isBull = c.close >= c.open;
            const color  = isBull ? BULL : BEAR;
            const bodyTop    = toY(Math.max(c.open, c.close));
            const bodyBottom = toY(Math.min(c.open, c.close));
            const bodyH      = Math.max(1, bodyBottom - bodyTop);
            const wickTop    = toY(c.high);
            const wickBot    = toY(c.low);
            const halfW      = Math.max(1.5, candleW / 2);

            return (
              <g key={c.ts}>
                {/* Wick */}
                <line
                  x1={x} y1={wickTop}
                  x2={x} y2={wickBot}
                  stroke={color} strokeWidth={1.2}
                />
                {/* Body */}
                <rect
                  x={x - halfW} y={bodyTop}
                  width={candleW} height={bodyH}
                  fill={color}
                  rx={1}
                />
              </g>
            );
          })}
        </g>

        {/* ── MA line ── */}
        {maPath && (
          <path
            d={maPath}
            fill="none"
            stroke={MA_COLOR}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.85}
          />
        )}

        {/* ── Trade markers ── */}
        {visible.map((c, i) => {
          const side = markerMap.get(c.ts);
          if (!side) return null;
          const x = candleX(i);
          const isBuy = side === "BUY";
          // BUY arrow below the low wick; SELL arrow above the high wick
          const arrowY = isBuy ? toY(c.low) + 14 : toY(c.high) - 14;
          // Triangle points (pointing toward the candle)
          const size = 7;
          const pts = isBuy
            ? `${x},${arrowY - size} ${x - size},${arrowY + size} ${x + size},${arrowY + size}`
            : `${x},${arrowY + size} ${x - size},${arrowY - size} ${x + size},${arrowY - size}`;
          return (
            <g key={`mk-${c.ts}`}>
              <polygon points={pts} fill={isBuy ? BULL : BEAR} opacity={0.95} />
              <text
                x={x} y={isBuy ? arrowY + size + 11 : arrowY - size - 3}
                textAnchor="middle" fontSize={9}
                fill={isBuy ? BULL : BEAR} fontWeight={700}
              >
                {side}
              </text>
            </g>
          );
        })}

        {/* ── Hover crosshair + tooltip ── */}
        {tooltip && (() => {
          const { x, candle } = tooltip;
          const tipX = x + TW + 8 > W ? x - TW - 8 : x + 8;
          const tipY = Math.max(PAD.top, Math.min(H - PAD.bottom - TH, toY(candle.close) - TH / 2));
          const isBull = candle.close >= candle.open;
          return (
            <g>
              {/* vertical crosshair */}
              <line
                x1={x} y1={PAD.top}
                x2={x} y2={H - PAD.bottom}
                stroke="#ffffff22" strokeWidth={1} strokeDasharray="4 3"
              />
              {/* tooltip box */}
              <rect
                x={tipX} y={tipY}
                width={TW} height={TH}
                fill={TOOLTIP_BG} stroke={GRID}
                rx={6} strokeWidth={1}
              />
              <text x={tipX + 10} y={tipY + 18} fontSize={11} fill="#94a3b8">
                {formatDate(candle.ts)}
              </text>
              {[
                ["O", candle.open],
                ["H", candle.high],
                ["L", candle.low],
                ["C", candle.close],
              ].map(([lbl, val], row) => (
                <g key={lbl as string}>
                  <text x={tipX + 10} y={tipY + 36 + row * 18} fontSize={11} fill={LABEL_CLR}>
                    {lbl}
                  </text>
                  <text
                    x={tipX + TW - 10} y={tipY + 36 + row * 18}
                    fontSize={11} textAnchor="end"
                    fill={isBull ? BULL : BEAR}
                  >
                    {formatPrice(val as number)}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs" style={{ color: LABEL_CLR }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: BULL }} />
          Bullish
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: BEAR }} />
          Bearish
        </span>
        {maPeriod > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded" style={{ background: MA_COLOR }} />
            MA{maPeriod}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0 h-0 border-l-4 border-r-4 border-b-6 border-transparent" style={{ borderBottomColor: BULL }} />
          BUY
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent" style={{ borderTopColor: BEAR }} />
          SELL
        </span>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}
