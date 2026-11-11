"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider, SliderNumberInput } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  Brain,
  BookOpen,
  Gauge,
  Loader2,
  Play,
  RotateCcw,
  Square,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import { RL_ASSETS, RLAsset } from "@/lib/rl/assets";
import { fetchHistory } from "@/lib/rl/data-client";
import { DEFAULT_ENV_CONFIG, EnvConfig, PriceSeries } from "@/lib/rl/environment";
import { DEFAULT_PPO_CONFIG, EvalResult, PPOAgent } from "@/lib/rl/ppo";
import { DEFAULT_REWARD_CONFIG } from "@/lib/rl/rewards";
import { DEFAULT_TRAIN_OPTIONS, TrainProgress, splitSeries, trainAgent } from "@/lib/rl/trainer";
import { WARMUP } from "@/lib/rl/features";
import { createRng, randn } from "@/lib/rl/nn";
import {
  DEFAULT_LIVE_OPTIONS,
  LiveDecision,
  LiveState,
  liveEquity,
  newLiveState,
  runLiveCycle,
} from "@/lib/rl/live";
import {
  AgentMeta,
  LearningEvent,
  RLSettings,
  TradeMemoryEntry,
  appendEvents,
  appendTradeMemory,
  clearAllRL,
  clearEvents,
  clearLive,
  clearTradeMemory,
  loadAgentMeta,
  loadAgentSnapshot,
  loadEvents,
  loadLiveRaw,
  loadSettings,
  loadTradeMemory,
  saveAgentMeta,
  saveAgentSnapshot,
  saveLiveRaw,
  saveSettings,
  DEFAULT_SETTINGS,
} from "@/lib/rl/store";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pct = (x: number, d = 1) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;
const inr = (x: number) => `₹${Math.round(x).toLocaleString("en-IN")}`;
const colorFor = (x: number) => (x >= 0 ? "text-green-600" : "text-red-600");

function buildEnvConfig(s: RLSettings): EnvConfig {
  return {
    ...DEFAULT_ENV_CONFIG,
    reward: { ...DEFAULT_REWARD_CONFIG, tradePenalty: s.tradePenalty, drawdownPenalty: s.drawdownPenalty },
  };
}

function actionBadge(a: string) {
  const cls =
    a === "BUY"
      ? "bg-green-100 text-green-700 hover:bg-green-100"
      : a === "SELL"
        ? "bg-red-100 text-red-700 hover:bg-red-100"
        : "bg-gray-100 text-gray-700 hover:bg-gray-100";
  return <Badge className={cls}>{a}</Badge>;
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${tone ?? ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RLTradingAgent() {
  const [settings, setSettings] = useState<RLSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const agentRef = useRef<PPOAgent | null>(null);
  const [meta, setMeta] = useState<AgentMeta | null>(null);
  const [, forceTick] = useState(0);
  const rerender = useCallback(() => forceTick((t) => t + 1), []);

  // training
  const [training, setTraining] = useState(false);
  const stopRef = useRef(false);
  const [history, setHistory] = useState<TrainProgress[]>([]);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"live" | "synthetic" | null>(null);
  const [valResult, setValResult] = useState<EvalResult | null>(null);
  const [valAsset, setValAsset] = useState<string>("");

  // live
  const [liveRunning, setLiveRunning] = useState(false);
  const liveRef = useRef<LiveState | null>(null);
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveBusy = useRef(false);
  const [lastDecisions, setLastDecisions] = useState<LiveDecision[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const demoSeries = useRef<Record<string, number[]>>({});
  const demoRng = useRef(createRng(Date.now() % 100000));
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [chartAsset, setChartAsset] = useState<string>("");

  // memory
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [memory, setMemory] = useState<TradeMemoryEntry[]>([]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const demoRef = useRef(demoMode);
  demoRef.current = demoMode;

  // ── init ──
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    const snap = loadAgentSnapshot();
    try {
      agentRef.current = snap ? PPOAgent.fromSnapshot(snap) : new PPOAgent(DEFAULT_PPO_CONFIG);
    } catch {
      agentRef.current = new PPOAgent(DEFAULT_PPO_CONFIG);
    }
    setMeta(loadAgentMeta());
    setEvents(loadEvents());
    setMemory(loadTradeMemory());
    liveRef.current = loadLiveRaw<LiveState>();
    setReady(true);
    return () => {
      stopRef.current = true;
      if (liveTimer.current) clearInterval(liveTimer.current);
    };
  }, []);

  const update = <K extends keyof RLSettings>(k: K, v: RLSettings[K]) => {
    const next = { ...settingsRef.current, [k]: v };
    setSettings(next);
    saveSettings(next);
  };

  const selectedAsset = useMemo(() => RL_ASSETS.find((a) => a.id === settings.assetId) ?? RL_ASSETS[0], [settings.assetId]);

  // ── training ──
  const handleTrain = async () => {
    const agent = agentRef.current;
    if (!agent || training) return;
    setTraining(true);
    stopRef.current = false;
    setHistory([]);
    setTrainError(null);
    setValResult(null);

    try {
      const envCfg = buildEnvConfig(settings);
      const primary = await fetchHistory(selectedAsset);
      setDataSource(primary.source);

      const extraSeries: PriceSeries[] = [];
      const trainedOn = [selectedAsset.id];
      if (settings.trainOnAllAssets) {
        const others = RL_ASSETS.filter((a) => a.id !== selectedAsset.id);
        const results = await Promise.allSettled(others.map((a) => fetchHistory(a)));
        results.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value.source === "live") {
            extraSeries.push(r.value.series);
            trainedOn.push(others[i].id);
          }
        });
      }

      const res = await trainAgent(
        agent,
        primary.series,
        {
          ...DEFAULT_TRAIN_OPTIONS,
          iterations: settings.iterations,
          syntheticSeries: settings.useSynthetic ? 3 : 0,
          envConfig: envCfg,
          extraSeries,
        },
        {
          onProgress: (p) => setHistory((h) => [...h, p]),
          shouldStop: () => stopRef.current,
        }
      );

      // Keep the checkpoint that did best on held-out data (guards against over-fitting)
      if (res.best) agent.loadSnapshot(res.best.snapshot);

      const { val } = splitSeries(primary.series, DEFAULT_TRAIN_OPTIONS.validationFraction);
      const finalVal = agent.evaluatePolicy(val, envCfg, WARMUP);
      setValResult(finalVal);
      setValAsset(selectedAsset.name);

      // Persist model + meta + outcome memory from the held-out backtest
      saveAgentSnapshot(agent.snapshot());
      const newMeta: AgentMeta = {
        trainedAt: Date.now(),
        trainedOn,
        iterations: (meta?.iterations ?? 0) + res.history.length,
        totalSteps: agent.totalSteps,
        onlineUpdates: meta?.onlineUpdates ?? 0,
        validation: {
          totalReturn: finalVal.totalReturn,
          buyHoldReturn: finalVal.buyHoldReturn,
          sharpe: finalVal.sharpe,
          maxDrawdown: finalVal.maxDrawdown,
          nTrades: finalVal.nTrades,
          asset: selectedAsset.name,
        },
      };
      saveAgentMeta(newMeta);
      setMeta(newMeta);

      const now = Date.now();
      const closed: TradeMemoryEntry[] = finalVal.trades
        .filter((t) => t.side === "SELL")
        .slice(-40)
        .map((t, i) => ({
          id: `bt-${now}-${i}`,
          ts: now,
          source: "backtest" as const,
          assetId: selectedAsset.id,
          assetName: selectedAsset.name,
          side: "SELL" as const,
          price: t.price,
          value: t.value,
          realizedPct: null,
        }));
      // realised % per closed trade comes from the closedTrades list
      finalVal.closedTrades.slice(-closed.length).forEach((c, i) => {
        if (closed[i]) closed[i].realizedPct = c.pnlPct;
      });
      appendTradeMemory(closed);
      setMemory(loadTradeMemory());

      setEvents(
        appendEvents([
          {
            ts: now,
            kind: "info",
            assetId: selectedAsset.id,
            message: `Offline PPO training finished: ${res.history.length} iterations on ${trainedOn.join(", ")}${settings.useSynthetic ? " + synthetic regimes" : ""}. Held-out return ${pct(finalVal.totalReturn)} vs buy & hold ${pct(finalVal.buyHoldReturn)}.`,
          },
        ])
      );

      // The policy changed — restart live learning with a clean buffer
      clearLive();
      liveRef.current = null;
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : String(e));
    } finally {
      setTraining(false);
      rerender();
    }
  };

  const handleResetModel = () => {
    if (training) return;
    agentRef.current = new PPOAgent({ ...DEFAULT_PPO_CONFIG, seed: Date.now() % 100000 });
    clearAllRL();
    clearLive();
    liveRef.current = null;
    setMeta(null);
    setHistory([]);
    setValResult(null);
    setEvents([]);
    setMemory([]);
    setLastDecisions([]);
    saveSettings(settingsRef.current);
    rerender();
  };

  // ── live learning ──
  const runCycle = useCallback(async () => {
    const agent = agentRef.current;
    if (!agent || liveBusy.current) return;
    liveBusy.current = true;
    try {
      const s = settingsRef.current;
      const assets = RL_ASSETS.filter((a) => s.liveAssets.includes(a.id));
      const envCfg = buildEnvConfig(s);
      const histories: Record<string, number[]> = {};
      const skipped: string[] = [];

      await Promise.all(
        assets.map(async (a) => {
          try {
            const h = await fetchHistory(a, true);
            if (h.source === "live") {
              histories[a.id] = h.series.prices;
            } else if (demoRef.current) {
              // Demo mode: simulate a new tick on top of the synthetic history
              const base = demoSeries.current[a.id] ?? h.series.prices.slice();
              const prev = base[base.length - 1];
              base.push(prev * Math.exp(0.0004 + 0.012 * randn(demoRng.current)));
              demoSeries.current[a.id] = base;
              histories[a.id] = base;
            } else {
              skipped.push(a.name);
            }
          } catch {
            skipped.push(a.name);
          }
        })
      );

      if (skipped.length) {
        setLiveNotice(
          `Live market data unavailable for ${skipped.join(", ")} — skipped. Enable “Demo mode” to practise on simulated ticks.`
        );
      } else {
        setLiveNotice(null);
      }
      if (!Object.keys(histories).length) return;

      if (!liveRef.current) liveRef.current = newLiveState(agent);
      const opts = {
        ...DEFAULT_LIVE_OPTIONS(envCfg.account, envCfg.reward),
        explore: s.liveExplore,
        learn: s.liveLearn,
      };
      const out = runLiveCycle(
        agent,
        liveRef.current,
        assets.filter((a) => histories[a.id]),
        histories,
        opts
      );

      saveLiveRaw(liveRef.current);
      if (out.update) {
        saveAgentSnapshot(agent.snapshot());
        const m = loadAgentMeta();
        if (m) {
          const nm = { ...m, onlineUpdates: (m.onlineUpdates ?? 0) + 1 };
          saveAgentMeta(nm);
          setMeta(nm);
        }
      }
      appendTradeMemory(out.memory);
      setMemory(loadTradeMemory());
      // Only log meaningful events (rewards that settled, updates, warnings)
      setEvents(appendEvents(out.events));
      setLastDecisions(out.decisions);
      rerender();
    } finally {
      liveBusy.current = false;
    }
  }, [rerender]);

  const startLive = () => {
    if (liveRunning) return;
    setLiveRunning(true);
    runCycle();
    liveTimer.current = setInterval(runCycle, Math.max(1, settingsRef.current.liveIntervalMinutes) * 60 * 1000);
  };
  const stopLive = () => {
    if (liveTimer.current) clearInterval(liveTimer.current);
    liveTimer.current = null;
    setLiveRunning(false);
  };
  const resetLive = () => {
    stopLive();
    clearLive();
    liveRef.current = null;
    demoSeries.current = {};
    setLastDecisions([]);
    rerender();
  };

  // ── derived ──
  const trainChartData = history.map((h) => ({
    iter: h.iteration,
    reward: Number(h.meanEpisodeReward.toFixed(2)),
    valReturn: h.validation ? Number((h.validation.totalReturn * 100).toFixed(2)) : undefined,
  }));
  const equityData = useMemo(() => {
    if (!valResult) return [];
    return valResult.equityCurve.map((e, i) => ({
      day: i,
      agent: Math.round(e),
      buyHold: Math.round(valResult.buyHoldCurve[i] ?? valResult.buyHoldCurve[valResult.buyHoldCurve.length - 1]),
    }));
  }, [valResult]);

  const live = liveRef.current;
  const liveEq = live ? liveEquity(live, DEFAULT_ENV_CONFIG.account.initialCash) : null;
  const progress = history.length ? (history[history.length - 1].iteration / settings.iterations) * 100 : 0;
  const lastH = history[history.length - 1];

  const realized = memory.filter((m) => m.realizedPct !== null);
  const wins = realized.filter((m) => (m.realizedPct ?? 0) > 0);
  const losses = realized.filter((m) => (m.realizedPct ?? 0) <= 0);
  const avg = (a: TradeMemoryEntry[]) => (a.length ? a.reduce((s, m) => s + (m.realizedPct ?? 0), 0) / a.length : 0);

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading agent…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-indigo-600" /> Self-Learning RL Trading Agent
          </h1>
          <p className="text-gray-500">
            Uses Reinforcement Learning (PPO) to learn from rewards, penalties, and historical trading outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">PPO-Clip · GAE · Actor-Critic</Badge>
          {meta ? (
            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
              {agentRef.current?.totalSteps.toLocaleString()} steps · {meta.onlineUpdates} live updates
            </Badge>
          ) : (
            <Badge variant="secondary">Untrained</Badge>
          )}
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4 flex gap-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            Educational / paper trading only. Nothing here places real orders or touches your portfolio. Reinforcement
            learning on price data often fails to beat buy &amp; hold on unseen data — judge the agent by the{" "}
            <strong>held-out validation</strong> results, not training reward.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="train" className="space-y-4">
        <TabsList>
          <TabsTrigger value="train">
            <Zap className="h-4 w-4 mr-1" /> Train
          </TabsTrigger>
          <TabsTrigger value="live">
            <Gauge className="h-4 w-4 mr-1" /> Live Learning
          </TabsTrigger>
          <TabsTrigger value="memory">
            <BookOpen className="h-4 w-4 mr-1" /> Outcomes &amp; Rewards
          </TabsTrigger>
        </TabsList>

        {/* ───────────── TRAIN ───────────── */}
        <TabsContent value="train" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Training setup</CardTitle>
                <CardDescription>PPO learns from historical prices by trial, reward and penalty.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Asset (validation target)</Label>
                  <Select value={settings.assetId} onValueChange={(v) => update("assetId", v)} disabled={training}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RL_ASSETS.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>PPO iterations</Label>
                    <SliderNumberInput aria-label="PPO iterations" value={settings.iterations} min={10} max={150} step={5} disabled={training} onValueChange={(v) => update("iterations", v)} />
                  </div>
                  <Slider
                    value={[settings.iterations]}
                    min={10}
                    max={150}
                    step={5}
                    disabled={training}
                    onValueChange={(v) => update("iterations", v[0])}
                  />
                  <p className="text-xs text-muted-foreground">~1,000 simulated trading steps per iteration (a few seconds each).</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Trade penalty</Label>
                    <SliderNumberInput aria-label="Trade penalty" value={settings.tradePenalty} min={0} max={0.2} step={0.01} disabled={training} onValueChange={(v) => update("tradePenalty", v)} />
                  </div>
                  <Slider
                    value={[settings.tradePenalty]}
                    min={0}
                    max={0.2}
                    step={0.01}
                    disabled={training}
                    onValueChange={(v) => update("tradePenalty", v[0])}
                  />
                  <p className="text-xs text-muted-foreground">Discourages over-trading on top of real fees.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Drawdown penalty</Label>
                    <SliderNumberInput aria-label="Drawdown penalty" value={settings.drawdownPenalty} min={0} max={2} step={0.1} disabled={training} onValueChange={(v) => update("drawdownPenalty", v)} />
                  </div>
                  <Slider
                    value={[settings.drawdownPenalty]}
                    min={0}
                    max={2}
                    step={0.1}
                    disabled={training}
                    onValueChange={(v) => update("drawdownPenalty", v[0])}
                  />
                  <p className="text-xs text-muted-foreground">Punishes losing more than 8% from the equity peak.</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mix in synthetic market regimes</Label>
                    <p className="text-xs text-muted-foreground">Bull / bear / range / chop — reduces over-fitting.</p>
                  </div>
                  <Switch checked={settings.useSynthetic} disabled={training} onCheckedChange={(v) => update("useSynthetic", v)} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Also learn from all other assets</Label>
                    <p className="text-xs text-muted-foreground">Slower; builds a more general policy.</p>
                  </div>
                  <Switch
                    checked={settings.trainOnAllAssets}
                    disabled={training}
                    onCheckedChange={(v) => update("trainOnAllAssets", v)}
                  />
                </div>

                <div className="flex gap-2">
                  {!training ? (
                    <Button onClick={handleTrain} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                      <Play className="h-4 w-4 mr-1" /> {meta ? "Continue training" : "Train agent"}
                    </Button>
                  ) : (
                    <Button onClick={() => (stopRef.current = true)} variant="destructive" className="flex-1">
                      <Square className="h-4 w-4 mr-1" /> Stop
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleResetModel} disabled={training} title="Reset model and all RL data">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                {dataSource === "synthetic" && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Live history for {selectedAsset.name} couldn’t be fetched, so this run used a <strong>simulated</strong> price series.
                    Results are for demonstration only.
                  </div>
                )}
                {trainError && <div className="text-xs text-red-600">{trainError}</div>}
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              {(training || history.length > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      Learning curve
                      {training && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
                    </CardTitle>
                    <CardDescription>
                      Mean reward per training episode (left) and held-out validation return % (right).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={progress} />
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trainChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="iter" />
                          <YAxis yAxisId="l" />
                          <YAxis yAxisId="r" orientation="right" />
                          <RTooltip />
                          <Legend />
                          <Line isAnimationActive={false} yAxisId="l" type="monotone" dataKey="reward" name="Train reward" stroke="#4f46e5" dot={false} />
                          <Line isAnimationActive={false}
                            yAxisId="r"
                            type="monotone"
                            dataKey="valReturn"
                            name="Validation return %"
                            stroke="#16a34a"
                            connectNulls
                            dot
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {lastH && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>Policy entropy: <strong>{lastH.stats.entropy.toFixed(2)}</strong></div>
                        <div>Approx KL: <strong>{lastH.stats.approxKL.toFixed(4)}</strong></div>
                        <div>Clip fraction: <strong>{(lastH.stats.clipFrac * 100).toFixed(1)}%</strong></div>
                        <div>Value expl. var: <strong>{lastH.stats.explainedVar.toFixed(2)}</strong></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {valResult && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Held-out backtest — {valAsset}</CardTitle>
                    <CardDescription>
                      The most recent 25% of history, never used for training. Greedy policy, fees &amp; slippage included.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Stat label="Agent return" value={pct(valResult.totalReturn)} tone={colorFor(valResult.totalReturn)} />
                      <Stat label="Buy & hold" value={pct(valResult.buyHoldReturn)} tone={colorFor(valResult.buyHoldReturn)} />
                      <Stat label="Sharpe (ann.)" value={valResult.sharpe.toFixed(2)} />
                      <Stat label="Max drawdown" value={`-${(valResult.maxDrawdown * 100).toFixed(1)}%`} tone="text-red-600" />
                      <Stat
                        label="Trades / win rate"
                        value={`${valResult.nTrades}`}
                        sub={valResult.closedTrades.length ? `${(valResult.winRate * 100).toFixed(0)}% of ${valResult.closedTrades.length} closed` : "no closed trades"}
                      />
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={equityData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis domain={["auto", "auto"]} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                          <RTooltip formatter={(v: number) => inr(v)} />
                          <Legend />
                          <Line isAnimationActive={false} type="monotone" dataKey="agent" name="RL agent" stroke="#4f46e5" dot={false} strokeWidth={2} />
                          <Line isAnimationActive={false} type="monotone" dataKey="buyHold" name="Buy & hold" stroke="#9ca3af" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {valResult.totalReturn < valResult.buyHoldReturn && (
                      <p className="text-xs text-amber-700">
                        The agent did not beat buy &amp; hold on this held-out period. Try more iterations, more assets, or a lower trade
                        penalty — and treat any edge with caution.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {!training && !history.length && !valResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">How the agent learns</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3 text-gray-600">
                    <p>
                      Every simulated day the agent sees 14 features (multi-horizon returns, RSI, MACD, Bollinger position, volatility,
                      plus its own position, P&amp;L, holding time and drawdown) and chooses <strong>BUY</strong> (deploy 50% of cash),{" "}
                      <strong>SELL</strong> (exit) or <strong>HOLD</strong>.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="rounded border border-green-200 bg-green-50 p-3">
                        <div className="font-medium text-green-800 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" /> Rewards
                        </div>
                        <ul className="list-disc pl-5 text-green-900 text-xs mt-1 space-y-1">
                          <li>Daily equity growth (log-return × 100)</li>
                          <li>Small bonus proportional to each profitable closed trade</li>
                        </ul>
                      </div>
                      <div className="rounded border border-red-200 bg-red-50 p-3">
                        <div className="font-medium text-red-800 flex items-center gap-1">
                          <TrendingDown className="h-4 w-4" /> Penalties
                        </div>
                        <ul className="list-disc pl-5 text-red-900 text-xs mt-1 space-y-1">
                          <li>Fees + slippage on every trade, plus a flat over-trading penalty</li>
                          <li>Drawdown beyond 8% of peak equity; sitting on a position down &gt;3%</li>
                          <li>Invalid actions (buy with no cash, sell with nothing) and losing closed trades</li>
                          <li>Large penalty if the account falls below 50% of its start</li>
                        </ul>
                      </div>
                    </div>
                    <p>
                      PPO nudges the policy toward actions that led to higher cumulative reward, while a clipped objective keeps each
                      update small and stable. After training, the <strong>Live Learning</strong> tab lets the agent keep improving from
                      real paper-trade outcomes.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ───────────── LIVE ───────────── */}
        <TabsContent value="live" className="space-y-4">
          {!meta && (
            <Card className="border-indigo-200 bg-indigo-50">
              <CardContent className="pt-4 text-sm text-indigo-900">
                The agent hasn’t been trained yet. You can still run live learning from scratch, but it will learn much faster after a
                short offline training run on the Train tab.
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live paper trading</CardTitle>
                <CardDescription>The agent acts, gets rewarded or penalised by the real price move, then updates itself.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Assets</Label>
                  <div className="flex flex-wrap gap-2">
                    {RL_ASSETS.map((a: RLAsset) => {
                      const on = settings.liveAssets.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          disabled={liveRunning}
                          onClick={() =>
                            update(
                              "liveAssets",
                              on ? settings.liveAssets.filter((x) => x !== a.id) : [...settings.liveAssets, a.id]
                            )
                          }
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            on ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 hover:bg-gray-100"
                          } ${liveRunning ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Cycle interval (minutes)</Label>
                    <SliderNumberInput aria-label="Cycle interval in minutes" value={settings.liveIntervalMinutes} min={1} max={60} step={1} disabled={liveRunning} onValueChange={(v) => update("liveIntervalMinutes", v)} />
                  </div>
                  <Slider
                    value={[settings.liveIntervalMinutes]}
                    min={1}
                    max={60}
                    step={1}
                    disabled={liveRunning}
                    onValueChange={(v) => update("liveIntervalMinutes", v[0])}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Keep learning (online PPO)</Label>
                    <p className="text-xs text-muted-foreground">Update weights from settled outcomes.</p>
                  </div>
                  <Switch checked={settings.liveLearn} onCheckedChange={(v) => update("liveLearn", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Explore</Label>
                    <p className="text-xs text-muted-foreground">Sample actions (needed to learn) vs. always pick the best.</p>
                  </div>
                  <Switch checked={settings.liveExplore} onCheckedChange={(v) => update("liveExplore", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Demo mode (simulated ticks)</Label>
                    <p className="text-xs text-muted-foreground">Use when live market data is unreachable.</p>
                  </div>
                  <Switch checked={demoMode} onCheckedChange={setDemoMode} />
                </div>

                <div className="flex gap-2">
                  {!liveRunning ? (
                    <Button
                      onClick={startLive}
                      disabled={!settings.liveAssets.length || training}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Play className="h-4 w-4 mr-1" /> Start
                    </Button>
                  ) : (
                    <Button onClick={stopLive} variant="destructive" className="flex-1">
                      <Square className="h-4 w-4 mr-1" /> Stop
                    </Button>
                  )}
                  <Button variant="outline" onClick={runCycle} disabled={training || !settings.liveAssets.length} title="Run one cycle now">
                    Step
                  </Button>
                  <Button variant="outline" onClick={resetLive} title="Reset paper accounts">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                {liveNotice && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{liveNotice}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  Rewards arrive one cycle after each decision (when the price has moved). Keep this tab open while running.
                </p>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat
                  label="Paper equity"
                  value={liveEq ? inr(liveEq.equity) : "—"}
                  sub={liveEq ? pct(liveEq.returnPct, 2) : "not started"}
                  tone={liveEq ? colorFor(liveEq.returnPct) : ""}
                />
                <Stat label="Cycles" value={`${live?.cycles ?? 0}`} sub={`${live?.settledDecisions ?? 0} settled`} />
                <Stat label="Online updates" value={`${live?.onlineUpdates ?? 0}`} sub="PPO from real outcomes" />
                <Stat
                  label="Cumulative reward"
                  value={(live?.cumReward ?? 0).toFixed(1)}
                  tone={colorFor(live?.cumReward ?? 0)}
                />
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Latest decisions</CardTitle>
                </CardHeader>
                <CardContent>
                  {lastDecisions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No decisions yet — press Start or Step.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>P(Hold / Buy / Sell)</TableHead>
                            <TableHead>Last reward</TableHead>
                            <TableHead className="text-right">Slot equity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lastDecisions.map((d) => (
                            <TableRow key={d.assetId}>
                              <TableCell className="font-medium">{d.name}</TableCell>
                              <TableCell>{inr(d.price)}</TableCell>
                              <TableCell>{actionBadge(d.action)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {d.probs.map((p) => `${(p * 100).toFixed(0)}%`).join(" / ")}
                              </TableCell>
                              <TableCell className={d.settled ? colorFor(d.settled.reward) : "text-muted-foreground"}>
                                {d.settled ? `${d.settled.reward >= 0 ? "+" : ""}${d.settled.reward.toFixed(2)}` : "—"}
                              </TableCell>
                              <TableCell className="text-right">{inr(d.equity)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Live Charts ── */}
              {(() => {
                const liveState = liveRef.current;
                const assetIds = liveState ? Object.keys(liveState.assets) : [];
                const activeId = chartAsset && assetIds.includes(chartAsset) ? chartAsset : assetIds[0] ?? "";
                const slot = liveState?.assets[activeId];
                const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                if (!liveState || assetIds.length === 0) return null;

                const priceData = (slot?.priceHistory ?? []).map((p) => ({
                  time: fmt(p.ts),
                  ts: p.ts,
                  price: p.price,
                  action: p.action,
                }));

                const equityData = (slot?.equityHistory ?? []).map((e) => ({
                  time: fmt(e.ts),
                  ts: e.ts,
                  equity: Math.round(e.equity),
                }));

                const buys = priceData.filter((p) => p.action === "BUY");
                const sells = priceData.filter((p) => p.action === "SELL");

                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle className="text-base">Live charts</CardTitle>
                          <CardDescription>Price ticks with trade markers · paper equity curve</CardDescription>
                        </div>
                        {assetIds.length > 1 && (
                          <div className="flex flex-wrap gap-1.5">
                            {assetIds.map((id) => (
                              <button
                                key={id}
                                onClick={() => setChartAsset(id)}
                                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                                  id === activeId
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-gray-700 hover:bg-gray-100"
                                }`}
                              >
                                {liveState.assets[id].name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {priceData.length < 2 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Waiting for price ticks — run a few cycles to populate the chart.
                        </p>
                      ) : (
                        <>
                          {/* Price chart */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                              Price — {slot?.name}
                            </p>
                            <div className="h-52">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={priceData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                  <YAxis
                                    domain={["auto", "auto"]}
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                    width={56}
                                  />
                                  <RTooltip
                                    formatter={(v: number) => [inr(v), "Price"]}
                                    labelFormatter={(l) => `Time: ${l}`}
                                  />
                                  <Line
                                    isAnimationActive={false}
                                    type="monotone"
                                    dataKey="price"
                                    stroke="#6366f1"
                                    dot={false}
                                    strokeWidth={1.5}
                                  />
                                  {buys.map((b) => (
                                    <ReferenceDot
                                      key={`buy-${b.ts}`}
                                      x={b.time}
                                      y={b.price}
                                      r={5}
                                      fill="#16a34a"
                                      stroke="#fff"
                                      strokeWidth={1.5}
                                    />
                                  ))}
                                  {sells.map((s) => (
                                    <ReferenceDot
                                      key={`sell-${s.ts}`}
                                      x={s.time}
                                      y={s.price}
                                      r={5}
                                      fill="#dc2626"
                                      stroke="#fff"
                                      strokeWidth={1.5}
                                    />
                                  ))}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600" /> BUY ({buys.length})</span>
                              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" /> SELL ({sells.length})</span>
                            </div>
                          </div>

                          {/* Equity curve */}
                          {equityData.length >= 2 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                                Paper equity — {slot?.name}
                              </p>
                              <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={equityData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                    <YAxis
                                      domain={["auto", "auto"]}
                                      tick={{ fontSize: 10 }}
                                      tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                                      width={56}
                                    />
                                    <RTooltip
                                      formatter={(v: number) => [inr(v), "Equity"]}
                                      labelFormatter={(l) => `Time: ${l}`}
                                    />
                                    <Line
                                      isAnimationActive={false}
                                      type="monotone"
                                      dataKey="equity"
                                      stroke="#16a34a"
                                      dot={false}
                                      strokeWidth={2}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        </TabsContent>

        {/* ───────────── MEMORY ───────────── */}
        <TabsContent value="memory" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Recorded outcomes" value={`${realized.length}`} sub="closed trades" />
            <Stat
              label="Win rate"
              value={realized.length ? `${((wins.length / realized.length) * 100).toFixed(0)}%` : "—"}
              sub={`${wins.length}W / ${losses.length}L`}
            />
            <Stat label="Avg win" value={wins.length ? pct(avg(wins), 2) : "—"} tone="text-green-600" />
            <Stat label="Avg loss" value={losses.length ? pct(avg(losses), 2) : "—"} tone="text-red-600" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Rewards, penalties &amp; updates</CardTitle>
                  <CardDescription>What the agent was told, and when it changed its mind.</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    clearEvents();
                    setEvents([]);
                  }}
                  title="Clear log"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80 pr-3">
                  {events.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
                  <div className="space-y-2">
                    {events.map((e) => (
                      <div
                        key={e.id}
                        className={`text-xs rounded border p-2 ${
                          e.kind === "reward"
                            ? (e.reward ?? 0) >= 0
                              ? "border-green-200 bg-green-50"
                              : "border-red-200 bg-red-50"
                            : e.kind === "update"
                              ? "border-indigo-200 bg-indigo-50"
                              : e.kind === "warn"
                                ? "border-amber-200 bg-amber-50"
                                : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between text-muted-foreground">
                          <span>{new Date(e.ts).toLocaleTimeString()}</span>
                          <span className="uppercase">{e.kind}</span>
                        </div>
                        <div>{e.message}</div>
                        {e.breakdown && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            pnl {e.breakdown.pnl.toFixed(2)} · cost {e.breakdown.tradeCost.toFixed(2)} · drawdown{" "}
                            {e.breakdown.drawdown.toFixed(2)} · underwater {e.breakdown.underwater.toFixed(2)} · realised{" "}
                            {e.breakdown.realized.toFixed(2)}
                            {e.breakdown.invalid !== 0 && ` · invalid ${e.breakdown.invalid.toFixed(2)}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Trade outcome memory</CardTitle>
                  <CardDescription>Closed trades from held-out backtests and live paper trading.</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    clearTradeMemory();
                    setMemory([]);
                  }}
                  title="Clear memory"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-muted-foreground">
                            No trades recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                      {memory.slice(0, 100).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs">{new Date(m.ts).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs">{m.assetName}</TableCell>
                          <TableCell>{actionBadge(m.side)}</TableCell>
                          <TableCell className="text-xs capitalize">{m.source}</TableCell>
                          <TableCell className={`text-right text-xs ${m.realizedPct !== null ? colorFor(m.realizedPct) : ""}`}>
                            {m.realizedPct !== null ? pct(m.realizedPct, 2) : "open"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
