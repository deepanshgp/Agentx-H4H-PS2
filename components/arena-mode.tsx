"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArenaConfig,
  ArenaLogEntry,
  ArenaSession,
  ARENA_DEFAULT_CONFIG,
  clearArenaData,
  createArenaSession,
  isArenaRunning,
  loadArenaLog,
  loadArenaSession,
  startArenaSession,
  stopArenaSession,
} from "@/lib/arena-agent";
import { API_KEYS } from "@/config/api-keys";
import { RiskLevel } from "@/lib/trading-agent";
import {
  Swords,
  Skull,
  Trophy,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  Activity,
  Flame,
  Heart,
  IndianRupee,
  BarChart2,
  BookOpen,
  Play,
  Square,
  RotateCcw,
  Info,
  AlertTriangle,
  Minus,
  Key,
} from "lucide-react";

// ─── Watched assets catalogue ─────────────────────────────────────────────────
const ARENA_ASSETS = [
  { id: "bitcoin",     label: "Bitcoin (BTC)",                  type: "crypto" },
  { id: "ethereum",   label: "Ethereum (ETH)",                 type: "crypto" },
  { id: "solana",     label: "Solana (SOL)",                   type: "crypto" },
  { id: "dogecoin",   label: "Dogecoin (DOGE)",                type: "crypto" },
  { id: "RELIANCE",   label: "Reliance Industries",            type: "stock"  },
  { id: "HDFCBANK",   label: "HDFC Bank",                      type: "stock"  },
  { id: "INFY",       label: "Infosys",                        type: "stock"  },
  { id: "TCS",        label: "TCS",                            type: "stock"  },
  { id: "ICICIBANK",  label: "ICICI Bank",                     type: "stock"  },
  { id: "TATAMOTORS", label: "Tata Motors",                    type: "stock"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtSmall = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

function elapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ─── Health bar ───────────────────────────────────────────────────────────────
function HealthBar({ current, start }: { current: number; start: number }) {
  const pct = Math.max(0, Math.min(100, (current / start) * 100));
  const color =
    pct > 60 ? "bg-green-500" : pct > 30 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 flex items-center gap-1">
          <Heart className="h-3 w-3 text-red-400" /> Agent Health
        </span>
        <span className="font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Log row ──────────────────────────────────────────────────────────────────
function ArenaLogRow({ entry }: { entry: ArenaLogEntry }) {
  const icons: Record<ArenaLogEntry["type"], React.ReactNode> = {
    info:   <Info      className="h-3.5 w-3.5 text-blue-400  shrink-0 mt-0.5" />,
    trade:  <Zap       className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />,
    learn:  <Brain     className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />,
    warn:   <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />,
    death:  <Skull     className="h-3.5 w-3.5 text-red-600   shrink-0 mt-0.5" />,
  };
  const colors: Record<ArenaLogEntry["type"], string> = {
    info:  "text-gray-600",
    trade: "text-gray-900 font-medium",
    learn: "text-purple-800 font-medium",
    warn:  "text-orange-700",
    death: "text-red-700 font-bold",
  };
  const time = new Date(entry.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className={`flex gap-2 py-1.5 border-b border-gray-50 last:border-0 ${entry.type === "learn" ? "bg-purple-50/40 rounded px-1" : ""}`}>
      {icons[entry.type]}
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${colors[entry.type]} break-words`}>{entry.message}</span>
        {entry.trade?.lesson && (
          <div className="mt-1 text-[11px] text-purple-700 italic bg-purple-50 px-2 py-1 rounded border border-purple-100">
            💡 {entry.trade.lesson}
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0 pt-0.5">{time}</span>
    </div>
  );
}

// ─── Setup screen ─────────────────────────────────────────────────────────────
function ArenaSetup({
  onStart,
}: {
  onStart: (config: ArenaConfig) => void;
}) {
  const [config, setConfig] = useState<ArenaConfig>({
    ...ARENA_DEFAULT_CONFIG,
    groqApiKey: API_KEYS.GROQ || "YOUR_GROQ_API_KEY",
  });

  const toggleAsset = (id: string) =>
    setConfig((p) => ({
      ...p,
      watchedAssets: p.watchedAssets.includes(id)
        ? p.watchedAssets.filter((a) => a !== id)
        : [...p.watchedAssets, id],
    }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 60%), radial-gradient(circle at 80% 20%, #4f46e5 0%, transparent 50%)" }}
        />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20 shadow-lg">
            <Swords className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Arena Mode</h2>
            <p className="text-white/70 text-sm mt-0.5">
              Give the AI a fixed budget. It trades, learns, and fights to survive.
              When the money runs out — the agent dies.
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3">
          {[
            { icon: <IndianRupee className="h-4 w-4" />, label: "Fixed Budget",   desc: "Isolated from your main portfolio" },
            { icon: <Brain       className="h-4 w-4" />, label: "Learns from P&L", desc: "Lessons injected into next decision" },
            { icon: <Skull       className="h-4 w-4" />, label: "Permadeath",      desc: "Hit zero and the session ends" },
          ].map((f) => (
            <div key={f.label} className="bg-white/10 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 text-white/90 font-semibold text-xs mb-1">
                {f.icon} {f.label}
              </div>
              <p className="text-white/50 text-[11px]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Config */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-purple-600" /> Starting Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Arena Budget</Label>
                  <span className="text-sm font-bold text-purple-700">{fmt(config.startingBalance)}</span>
                </div>
                <Slider
                  min={1000} max={100000} step={1000}
                  value={[config.startingBalance]}
                  onValueChange={([v]) => setConfig((p) => ({ ...p, startingBalance: v }))}
                />
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>₹1,000</span><span>₹1,00,000</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  This money is completely isolated — the agent cannot touch your main portfolio.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Risk & Timing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Risk Level</Label>
                <Select
                  value={config.riskLevel}
                  onValueChange={(v) => setConfig((p) => ({ ...p, riskLevel: v as RiskLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">
                      <span className="flex items-center gap-2">
                        <Minus className="h-3.5 w-3.5 text-blue-500" /> Conservative
                      </span>
                    </SelectItem>
                    <SelectItem value="moderate">
                      <span className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-yellow-500" /> Moderate
                      </span>
                    </SelectItem>
                    <SelectItem value="aggressive">
                      <span className="flex items-center gap-2">
                        <Flame className="h-3.5 w-3.5 text-red-500" /> Aggressive
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Cycle Interval</Label>
                  <span className="text-sm font-medium text-purple-700">every {config.intervalMinutes} min</span>
                </div>
                <Slider
                  min={1} max={30} step={1}
                  value={[config.intervalMinutes]}
                  onValueChange={([v]) => setConfig((p) => ({ ...p, intervalMinutes: v }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Min Confidence</Label>
                  <span className="text-sm font-medium text-purple-700">{config.minConfidenceThreshold}%</span>
                </div>
                <Slider
                  min={40} max={90} step={5}
                  value={[config.minConfidenceThreshold]}
                  onValueChange={([v]) => setConfig((p) => ({ ...p, minConfidenceThreshold: v }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Key className="h-4 w-4 text-orange-500" /> Groq API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="gsk_…"
                type="password"
                className="font-mono text-xs"
                value={config.groqApiKey === "YOUR_GROQ_API_KEY" ? "" : config.groqApiKey}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, groqApiKey: e.target.value || "YOUR_GROQ_API_KEY" }))
                }
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Same key as the Auto Trader. Free at{" "}
                <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="underline text-purple-600">
                  console.groq.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right — asset picker */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Arena Assets</CardTitle>
                <CardDescription className="text-xs mt-0.5">Which assets the agent can trade in the arena</CardDescription>
              </div>
              <Badge variant="secondary">{config.watchedAssets.length} selected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {["crypto", "stock"].map((type) => (
                <div key={type}>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-3 first:mt-0">
                    {type === "crypto" ? "Cryptocurrency" : "Indian Stocks"}
                  </p>
                  <div className="space-y-1">
                    {ARENA_ASSETS.filter((a) => a.type === type).map((asset) => {
                      const active = config.watchedAssets.includes(asset.id);
                      return (
                        <div
                          key={asset.id}
                          onClick={() => toggleAsset(asset.id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                            active
                              ? "bg-purple-50 border-purple-200 text-purple-900"
                              : "bg-white border-gray-100 hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          <span className="text-sm">{asset.label}</span>
                          <Switch
                            checked={active}
                            onCheckedChange={() => toggleAsset(asset.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-[state=checked]:bg-purple-600 scale-90"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-semibold gap-2 shadow-md"
              disabled={config.watchedAssets.length === 0}
              onClick={() => onStart(config)}
            >
              <Swords className="h-4 w-4" /> Enter the Arena
            </Button>
            {config.watchedAssets.length === 0 && (
              <p className="text-[11px] text-red-500 text-center mt-2">Select at least one asset</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Death screen ─────────────────────────────────────────────────────────────
function DeathScreen({
  session,
  onReset,
}: {
  session: ArenaSession;
  onReset: () => void;
}) {
  const pnl = session.totalValue - session.startingBalance;
  const pnlPct = ((session.totalValue / session.startingBalance) - 1) * 100;
  const duration = session.endedAt ? session.endedAt - session.startedAt : Date.now() - session.startedAt;
  const wins = session.trades.filter((t) => t.outcome === "profit").length;
  const losses = session.trades.filter((t) => t.outcome === "loss").length;

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      {/* Death card */}
      <div className="w-full max-w-lg rounded-2xl bg-gradient-to-br from-gray-950 via-red-950 to-gray-900 p-8 text-white text-center shadow-2xl border border-red-900/50">
        <div className="text-6xl mb-3">💀</div>
        <h2 className="text-2xl font-black tracking-tight mb-1">Agent Eliminated</h2>
        <p className="text-red-300/80 text-sm mb-5">{session.deathReason}</p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/50 mb-1">Final Value</p>
            <p className="text-lg font-bold">{fmt(session.totalValue)}</p>
          </div>
          <div className={`bg-white/5 rounded-xl p-3 border border-white/10`}>
            <p className="text-xs text-white/50 mb-1">Total P&L</p>
            <p className={`text-lg font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              {pnl >= 0 ? "+" : ""}{fmt(pnl)} ({pnlPct.toFixed(1)}%)
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/50 mb-1">Survived</p>
            <p className="text-lg font-bold">{elapsed(duration)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/50 mb-1">Trades</p>
            <p className="text-lg font-bold">
              <span className="text-green-400">{wins}W</span>
              {" / "}
              <span className="text-red-400">{losses}L</span>
            </p>
          </div>
        </div>

        {/* Lessons learned */}
        {session.memory.lessons.length > 0 && (
          <div className="text-left bg-white/5 rounded-xl p-4 border border-purple-500/20 mb-5">
            <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs mb-2">
              <Brain className="h-3.5 w-3.5" /> What the agent learned:
            </div>
            <div className="space-y-1.5">
              {session.memory.lessons.slice(-5).map((lesson, i) => (
                <p key={i} className="text-[11px] text-white/60 italic">• {lesson}</p>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={onReset}
          className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold gap-2"
        >
          <RotateCcw className="h-4 w-4" /> New Arena Session
        </Button>
      </div>
    </div>
  );
}

// ─── Live arena view ──────────────────────────────────────────────────────────
function ArenaLive({
  session,
  log,
  isRunning,
  onStop,
  onReset,
}: {
  session: ArenaSession;
  log: ArenaLogEntry[];
  isRunning: boolean;
  onStop: () => void;
  onReset: () => void;
}) {
  const pnl = session.totalValue - session.startingBalance;
  const pnlPct = ((session.totalValue / session.startingBalance) - 1) * 100;
  const wins = session.trades.filter((t) => t.outcome === "profit").length;
  const losses = session.trades.filter((t) => t.outcome === "loss").length;
  const totalClosed = wins + losses;
  const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 100) : 0;
  const duration = Date.now() - session.startedAt;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-800 flex items-center justify-center shadow">
            <Swords className="h-5 w-5 text-white" />
            {isRunning && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-base leading-tight">Arena Mode — Active Session</h3>
            <p className="text-xs text-gray-500">Running for {elapsed(duration)} · Cycle #{session.cycleCount}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isRunning ? (
            <Button size="sm" variant="destructive" onClick={onStop} className="gap-1.5">
              <Square className="h-3.5 w-3.5" /> Stop
            </Button>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Paused</Badge>
          )}
          <Button size="sm" variant="outline" onClick={onReset} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> New Session
          </Button>
        </div>
      </div>

      {/* Health + main stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Balance card */}
        <Card className="col-span-1 sm:col-span-2 lg:col-span-2 border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardContent className="pt-4 pb-3 px-4 space-y-3">
            <HealthBar current={session.totalValue} start={session.startingBalance} />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Value</p>
                <p className="text-2xl font-black text-gray-900">{fmt(session.totalValue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">P&L</p>
                <p className={`text-lg font-bold ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                  <span className="text-sm ml-1">({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)</span>
                </p>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-purple-100">
              <span>Cash: <strong className="text-gray-700">{fmt(session.balance)}</strong></span>
              <span>Peak: <strong className="text-gray-700">{fmt(session.peakValue)}</strong></span>
              <span>Start: <strong className="text-gray-700">{fmt(session.startingBalance)}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Win rate */}
        <Card className="border-green-100 bg-green-50/40">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
              <Trophy className="h-3.5 w-3.5" /> Win Rate
            </div>
            <p className="text-3xl font-black text-green-700">{winRate}%</p>
            <p className="text-[11px] text-green-600 mt-1">{wins}W / {losses}L closed</p>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card className="border-purple-100 bg-purple-50/40">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1 text-xs text-purple-700 mb-1">
              <Brain className="h-3.5 w-3.5" /> Lessons Learned
            </div>
            <p className="text-3xl font-black text-purple-700">{session.memory.lessons.length}</p>
            <p className="text-[11px] text-purple-600 mt-1">stored in agent memory</p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings */}
      {session.holdings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-indigo-600" /> Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {session.holdings.map((h) => {
                const isUp = h.unrealisedPnl >= 0;
                return (
                  <div
                    key={h.assetId}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${
                      isUp ? "bg-green-50/60 border-green-100" : "bg-red-50/60 border-red-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${isUp ? "bg-green-100" : "bg-red-100"}`}>
                        {isUp
                          ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">{h.assetName}</p>
                        <p className="text-[11px] text-gray-500">{h.quantity} units @ avg {fmtSmall(h.avgBuyPrice)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xs text-gray-900">{fmtSmall(h.currentPrice * h.quantity)}</p>
                      <p className={`text-[11px] font-semibold ${isUp ? "text-green-600" : "text-red-600"}`}>
                        {isUp ? "+" : ""}{fmtSmall(h.unrealisedPnl)} ({isUp ? "+" : ""}{h.unrealisedPnlPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory / Lessons */}
      {session.memory.lessons.length > 0 && (
        <Card className="border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-600" /> Agent Memory — Learned Lessons
            </CardTitle>
            <CardDescription className="text-xs">
              These are injected into the agent's prompt every cycle so it doesn't repeat mistakes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...session.memory.lessons].reverse().map((lesson, i) => (
                <div key={i} className="flex items-start gap-2 text-xs bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                  <Brain className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                  <span className="text-purple-900">{lesson}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> Arena Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Swords className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Waiting for first cycle…</p>
            </div>
          ) : (
            <ScrollArea className="h-80 pr-2">
              {log.map((entry) => <ArenaLogRow key={entry.id} entry={entry} />)}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export default function ArenaMode() {
  const { toast } = useToast();
  const [session, setSession] = useState<ArenaSession | null>(null);
  const [log, setLog] = useState<ArenaLogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick for duration display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const saved = loadArenaSession();
    if (saved) {
      setSession(saved);
      setLog(loadArenaLog());
      setIsRunning(isArenaRunning());
    }
    // Poll log every 3 s
    const id = setInterval(() => {
      setLog(loadArenaLog());
      const s = loadArenaSession();
      if (s) setSession(s);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const handleStart = (config: ArenaConfig) => {
    const effectiveKey =
      config.groqApiKey && config.groqApiKey !== "YOUR_GROQ_API_KEY"
        ? config.groqApiKey
        : process.env.NEXT_PUBLIC_GROQ_API_KEY || API_KEYS.GROQ;

    if (!effectiveKey || effectiveKey === "YOUR_GROQ_API_KEY") {
      toast({ title: "Groq API key required", variant: "destructive" });
      return;
    }

    const finalConfig = { ...config, groqApiKey: effectiveKey };
    const newSession = createArenaSession(finalConfig);
    setSession(newSession);
    setLog([]);
    setIsRunning(true);

    startArenaSession(
      newSession,
      (entry) => setLog((prev) => [entry, ...prev].slice(0, 300)),
      (updated) => {
        setSession({ ...updated });
        if (updated.status === "dead") {
          setIsRunning(false);
          stopArenaSession();
          toast({
            title: "💀 Agent eliminated",
            description: updated.deathReason,
            variant: "destructive",
          });
        }
      }
    );

    toast({
      title: "🏟️ Arena started!",
      description: `Agent given ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(config.startingBalance)} — survive or die.`,
    });
  };

  const handleStop = () => {
    stopArenaSession();
    setIsRunning(false);
    toast({ title: "⏸ Arena paused" });
  };

  const handleReset = () => {
    stopArenaSession();
    clearArenaData();
    setSession(null);
    setLog([]);
    setIsRunning(false);
    toast({ title: "🔄 Arena reset — ready for new session" });
  };

  // No session yet → show setup
  if (!session) return <ArenaSetup onStart={handleStart} />;

  // Dead → death screen
  if (session.status === "dead") return <DeathScreen session={session} onReset={handleReset} />;

  // Active session
  return (
    <ArenaLive
      session={session}
      log={log}
      isRunning={isRunning}
      onStop={handleStop}
      onReset={handleReset}
    />
  );
}
