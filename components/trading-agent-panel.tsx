"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  AgentConfig,
  AgentLogEntry,
  AgentStatus,
  DEFAULT_CONFIG,
  RiskLevel,
  clearAgentLog,
  isAgentRunning,
  loadAgentConfig,
  loadAgentLog,
  saveAgentConfig,
  startAgent,
  stopAgent,
} from "@/lib/trading-agent";
import { API_KEYS } from "@/config/api-keys";
import TradeJournal from "@/components/trade-journal";
import ArenaMode from "@/components/arena-mode";
import {
  Bot,
  Play,
  Square,
  Trash2,
  Settings2,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  Zap,
  Newspaper,
  Key,
  BookOpen,
  Swords,
} from "lucide-react";

// ─── Watched-asset catalogue ───────────────────────────────────────────────────
const AVAILABLE_ASSETS = [
  { id: "bitcoin",     label: "Bitcoin (BTC)",                   type: "crypto" },
  { id: "ethereum",   label: "Ethereum (ETH)",                  type: "crypto" },
  { id: "solana",     label: "Solana (SOL)",                    type: "crypto" },
  { id: "dogecoin",   label: "Dogecoin (DOGE)",                 type: "crypto" },
  { id: "cardano",    label: "Cardano (ADA)",                   type: "crypto" },
  { id: "ripple",     label: "XRP (XRP)",                       type: "crypto" },
  { id: "RELIANCE",   label: "Reliance Industries (RELIANCE)",  type: "stock"  },
  { id: "HDFCBANK",   label: "HDFC Bank (HDFCBANK)",            type: "stock"  },
  { id: "INFY",       label: "Infosys (INFY)",                  type: "stock"  },
  { id: "TCS",        label: "TCS (TCS)",                       type: "stock"  },
  { id: "ICICIBANK",  label: "ICICI Bank (ICICIBANK)",          type: "stock"  },
  { id: "WIPRO",      label: "Wipro (WIPRO)",                   type: "stock"  },
  { id: "TATAMOTORS", label: "Tata Motors (TATAMOTORS)",        type: "stock"  },
  { id: "BAJFINANCE", label: "Bajaj Finance (BAJFINANCE)",      type: "stock"  },
];

// ─── Log entry row ─────────────────────────────────────────────────────────────
function LogRow({ entry }: { entry: AgentLogEntry }) {
  const icons: Record<AgentLogEntry["type"], React.ReactNode> = {
    info:  <Info          className="h-3.5 w-3.5 text-blue-500   shrink-0 mt-0.5" />,
    trade: <Zap           className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />,
    warn:  <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />,
    error: <AlertTriangle className="h-3.5 w-3.5 text-red-500    shrink-0 mt-0.5" />,
  };

  const colors: Record<AgentLogEntry["type"], string> = {
    info:  "text-gray-700",
    trade: "text-gray-900 font-medium",
    warn:  "text-orange-700",
    error: "text-red-700",
  };

  const time = new Date(entry.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
      {icons[entry.type]}
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${colors[entry.type]} break-words`}>{entry.message}</span>
        {entry.decision && (
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px] h-4">
              {entry.decision.assetType}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-4">
              {entry.decision.confidence}% confidence
            </Badge>
            {entry.decision.newsHeadlines[0] && (
              <span className="text-[10px] text-gray-400 italic truncate max-w-[260px]">
                "{entry.decision.newsHeadlines[0]}"
              </span>
            )}
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-400 shrink-0 pt-0.5">{time}</span>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, { label: string; className: string }> = {
    idle:    { label: "Idle",    className: "bg-gray-100 text-gray-600 border-gray-200" },
    running: { label: "Running", className: "bg-green-100 text-green-700 border-green-200 animate-pulse" },
    paused:  { label: "Paused",  className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    error:   { label: "Error",   className: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "running" ? "bg-green-500" : "bg-current"}`} />
      {s.label}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function TradingAgentPanel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [log, setLog] = useState<AgentLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"config" | "log" | "journal" | "arena">("config");

  // Hydrate from localStorage on mount
  useEffect(() => {
    setConfig(loadAgentConfig());
    setLog(loadAgentLog());
    setStatus(isAgentRunning() ? "running" : "idle");

    // Poll log every 3 s while agent might be running
    const id = setInterval(() => setLog(loadAgentLog()), 3000);
    return () => clearInterval(id);
  }, []);

  const handleStart = () => {
    if (!config.watchedAssets.length) {
      toast({ title: "No assets selected", description: "Select at least one asset to watch.", variant: "destructive" });
      return;
    }
    const effectiveGroqKey =
      (config.groqApiKey && config.groqApiKey !== "YOUR_GROQ_API_KEY")
        ? config.groqApiKey
        : (process.env.NEXT_PUBLIC_GROQ_API_KEY || API_KEYS.GROQ);

    if (!effectiveGroqKey || effectiveGroqKey === "YOUR_GROQ_API_KEY") {
      toast({ title: "Groq API key required", description: "Add your Groq API key in the Configure tab first.", variant: "destructive" });
      return;
    }
    const updatedConfig = { ...config, groqApiKey: effectiveGroqKey };
    saveAgentConfig(updatedConfig);
    startAgent(
      updatedConfig,
      (entry) => setLog((prev) => [entry, ...prev].slice(0, 200)),
      (s) => setStatus(s)
    );
    setStatus("running");
    setActiveTab("log");
    toast({ title: "🤖 Agent started", description: `Watching ${config.watchedAssets.length} assets every ${config.intervalMinutes} min` });
  };

  const handleStop = () => {
    stopAgent((s) => setStatus(s));
    setStatus("idle");
    setLog(loadAgentLog());
    toast({ title: "🛑 Agent stopped" });
  };

  const handleClearLog = () => {
    clearAgentLog();
    setLog([]);
  };

  const toggleAsset = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      watchedAssets: prev.watchedAssets.includes(id)
        ? prev.watchedAssets.filter((a) => a !== id)
        : [...prev.watchedAssets, id],
    }));
  };

  const tradeCount = log.filter((e) => e.type === "trade").length;
  const buyCount   = log.filter((e) => e.type === "trade" && e.message.includes("BUY")).length;
  const sellCount  = log.filter((e) => e.type === "trade" && e.message.includes("SELL")).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">AI Auto-Trading Agent</h3>
            <p className="text-sm text-gray-500">News-driven trades powered by Groq GPT-OSS 20B</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {status === "running" ? (
            <Button size="sm" variant="destructive" onClick={handleStop} className="gap-1.5">
              <Square className="h-3.5 w-3.5" /> Stop Agent
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              onClick={handleStart}
            >
              <Play className="h-3.5 w-3.5" /> Start Agent
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-gray-100">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500 mb-1">Total Trades</p>
            <p className="text-2xl font-bold">{tradeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-green-100 bg-green-50/40">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
              <TrendingUp className="h-3 w-3" /> Buys
            </div>
            <p className="text-2xl font-bold text-green-700">{buyCount}</p>
          </CardContent>
        </Card>
        <Card className="border-red-100 bg-red-50/40">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1 text-xs text-red-600 mb-1">
              <TrendingDown className="h-3 w-3" /> Sells
            </div>
            <p className="text-2xl font-bold text-red-700">{sellCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["config", "log", "journal", "arena"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === t
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "config" ? (
              <span className="flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" />Configure</span>
            ) : t === "log" ? (
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />Activity Log
                {log.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-full px-1.5">{log.length}</span>
                )}
              </span>
            ) : t === "journal" ? (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />Journal
                {tradeCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-full px-1.5">{tradeCount}</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5 text-purple-600" />Arena
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          CONFIG TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === "config" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-5">
            {/* Risk & Budget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Risk & Budget</CardTitle>
                <CardDescription className="text-xs">Controls how aggressively the agent trades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
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
                          <Minus className="h-3.5 w-3.5 text-blue-500" /> Conservative — fewer, safer trades
                        </span>
                      </SelectItem>
                      <SelectItem value="moderate">
                        <span className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-yellow-500" /> Moderate — balanced approach
                        </span>
                      </SelectItem>
                      <SelectItem value="aggressive">
                        <span className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-red-500" /> Aggressive — maximum activity
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Max Trade Amount</Label>
                    <span className="text-sm font-medium text-purple-700">
                      ₹{config.maxTradeAmountINR.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <Slider
                    min={500}
                    max={50000}
                    step={500}
                    value={[config.maxTradeAmountINR]}
                    onValueChange={([v]) => setConfig((p) => ({ ...p, maxTradeAmountINR: v }))}
                    className="accent-purple-600"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>₹500</span><span>₹50,000</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Min Confidence Threshold</Label>
                    <span className="text-sm font-medium text-purple-700">{config.minConfidenceThreshold}%</span>
                  </div>
                  <Slider
                    min={40}
                    max={95}
                    step={5}
                    value={[config.minConfidenceThreshold]}
                    onValueChange={([v]) => setConfig((p) => ({ ...p, minConfidenceThreshold: v }))}
                  />
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>40% (lenient)</span><span>95% (strict)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stop-loss / Take-profit */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Stop-Loss & Take-Profit</CardTitle>
                <CardDescription className="text-xs">Automatically protect gains and limit losses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Stop-Loss</Label>
                    <span className="text-sm font-medium text-red-600">-{config.stopLossPercent}%</span>
                  </div>
                  <Slider
                    min={2}
                    max={20}
                    step={1}
                    value={[config.stopLossPercent]}
                    onValueChange={([v]) => setConfig((p) => ({ ...p, stopLossPercent: v }))}
                  />
                  <p className="text-[11px] text-gray-400">Sell all holdings if loss exceeds this threshold</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Take-Profit</Label>
                    <span className="text-sm font-medium text-green-600">+{config.takeProfitPercent}%</span>
                  </div>
                  <Slider
                    min={5}
                    max={50}
                    step={5}
                    value={[config.takeProfitPercent]}
                    onValueChange={([v]) => setConfig((p) => ({ ...p, takeProfitPercent: v }))}
                  />
                  <p className="text-[11px] text-gray-400">Sell 50% of holdings when gain reaches this target</p>
                </div>
              </CardContent>
            </Card>

            {/* Timing & API Keys */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Timing & API Keys</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Run Every</Label>
                    <span className="text-sm font-medium text-purple-700">{config.intervalMinutes} min</span>
                  </div>
                  <Slider
                    min={1}
                    max={60}
                    step={1}
                    value={[config.intervalMinutes]}
                    onValueChange={([v]) => setConfig((p) => ({ ...p, intervalMinutes: v }))}
                  />
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>1 min</span><span>60 min</span>
                  </div>
                </div>

                {/* Groq API key — required */}
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-orange-500" />
                    Groq API Key
                    <span className="text-red-500 text-xs font-normal">(required)</span>
                  </Label>
                  <Input
                    placeholder="gsk_…"
                    value={config.groqApiKey === "YOUR_GROQ_API_KEY" ? "" : (config.groqApiKey ?? "")}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        groqApiKey: e.target.value || "YOUR_GROQ_API_KEY",
                      }))
                    }
                    type="password"
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-gray-400">
                    Free key at{" "}
                    <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="underline text-purple-600">
                      console.groq.com
                    </a>
                    . Powers LLaMA 3.3 70B trading decisions.
                  </p>
                </div>

                {/* GNews API key — optional */}
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Newspaper className="h-3.5 w-3.5" />
                    GNews API Key
                    <span className="text-gray-400 text-xs font-normal">(optional fallback)</span>
                  </Label>
                  <Input
                    placeholder="Leave blank to use mock headlines"
                    value={config.newsApiKey === "YOUR_GNEWS_API_KEY" ? "" : config.newsApiKey}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        newsApiKey: e.target.value || "YOUR_GNEWS_API_KEY",
                      }))
                    }
                    type="password"
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-gray-400">
                    Free key at{" "}
                    <a href="https://gnews.io" target="_blank" rel="noreferrer" className="underline text-purple-600">
                      gnews.io
                    </a>
                    . Without a key the agent uses curated mock headlines.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column — watched assets */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Watched Assets</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Toggle which assets the agent can trade</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">{config.watchedAssets.length} selected</Badge>
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
                      {AVAILABLE_ASSETS.filter((a) => a.type === type).map((asset) => {
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
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                onClick={() => {
                  saveAgentConfig(config);
                  toast({ title: "✅ Configuration saved" });
                }}
              >
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ACTIVITY LOG TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === "log" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Activity Log</CardTitle>
                <CardDescription className="text-xs">Real-time feed of agent decisions and trades</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7"
                onClick={handleClearLog}
              >
                <Trash2 className="h-3 w-3" /> Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No activity yet</p>
                <p className="text-xs mt-1">Start the agent to see real-time decisions here</p>
              </div>
            ) : (
              <ScrollArea className="h-[480px] pr-3">
                <div className="space-y-0">
                  {log.map((entry) => (
                    <LogRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════
          JOURNAL TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === "journal" && (
        <TradeJournal onNavigateToConfig={() => setActiveTab("config")} />
      )}

      {/* ══════════════════════════════════════════════════
          ARENA TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === "arena" && <ArenaMode />}

      {/* ── Disclaimer ── */}
      <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
        <p>
          <strong>Disclaimer:</strong> This agent uses AI-generated signals and simulated trades in a demo portfolio.
          It does not execute real financial transactions. Always conduct your own research before investing.
        </p>
      </div>
    </div>
  );
}
