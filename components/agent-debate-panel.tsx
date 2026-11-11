"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  runDebate,
  loadDebateHistory,
  clearDebateHistory,
  DEBATE_AGENTS,
  DebateSession,
  AgentArgument,
  DebateAgentRole,
} from "@/lib/agent-debate";
import { loadAgentConfig } from "@/lib/trading-agent";
import { getActiveProvider } from "@/lib/llm-client";
import { fetchRealTimeCryptoData, fetchRealTimeStockData } from "@/lib/market-api";
import { fetchFinancialNews, buildNewsSummaryForAsset } from "@/lib/news-service";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  BarChart2,
  Gavel,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Clock,
  Zap,
  History,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVAILABLE_ASSETS = [
  { id: "bitcoin",     label: "Bitcoin (BTC)",                  type: "crypto" as const },
  { id: "ethereum",   label: "Ethereum (ETH)",                 type: "crypto" as const },
  { id: "solana",     label: "Solana (SOL)",                   type: "crypto" as const },
  { id: "dogecoin",   label: "Dogecoin (DOGE)",                type: "crypto" as const },
  { id: "ripple",     label: "XRP (XRP)",                      type: "crypto" as const },
  { id: "RELIANCE",   label: "Reliance Industries",            type: "stock"  as const },
  { id: "HDFCBANK",   label: "HDFC Bank",                      type: "stock"  as const },
  { id: "INFY",       label: "Infosys",                        type: "stock"  as const },
  { id: "TCS",        label: "TCS",                            type: "stock"  as const },
  { id: "ICICIBANK",  label: "ICICI Bank",                     type: "stock"  as const },
];

const ROLE_ICON: Record<DebateAgentRole, React.ReactNode> = {
  bull:      <TrendingUp   className="h-4 w-4" />,
  bear:      <TrendingDown className="h-4 w-4" />,
  risk:      <ShieldCheck  className="h-4 w-4" />,
  quant:     <BarChart2    className="h-4 w-4" />,
  moderator: <Gavel        className="h-4 w-4" />,
};

const VOTE_COLOR: Record<string, string> = {
  buy:  "bg-green-100 text-green-700 border-green-300",
  sell: "bg-red-100 text-red-700 border-red-300",
  hold: "bg-gray-100 text-gray-600 border-gray-300",
};

const VOTE_LABEL: Record<string, string> = {
  buy: "BUY", sell: "SELL", hold: "HOLD",
};

function consensusBadge(level: string) {
  const map: Record<string, string> = {
    unanimous: "bg-green-600 text-white",
    majority:  "bg-blue-600 text-white",
    split:     "bg-yellow-500 text-white",
    contested: "bg-red-600 text-white",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] ?? "bg-gray-200 text-gray-700"}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

// ─── Single agent card ────────────────────────────────────────────────────────

function AgentCard({
  role,
  arg,
  isWaiting,
}: {
  role: DebateAgentRole;
  arg?: AgentArgument;
  isWaiting: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta = DEBATE_AGENTS[role];
  const isModerator = role === "moderator";

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-500 ${
        isModerator
          ? "border-purple-400 shadow-md shadow-purple-100"
          : arg
          ? meta.borderColor
          : "border-gray-200"
      } ${arg ? meta.color : "bg-gray-50"} ${isWaiting ? "opacity-50" : "opacity-100"}`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <div className={`font-semibold text-sm ${arg ? meta.textColor : "text-gray-500"}`}>
              {meta.name}
            </div>
            <div className="text-[10px] text-gray-400 leading-tight">{meta.description}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isWaiting && !arg && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
          {arg && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${VOTE_COLOR[arg.vote]}`}>
              {VOTE_LABEL[arg.vote]}
            </span>
          )}
          {arg && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      {arg && (
        <div className="px-3 pb-2">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Confidence</span>
            <span className="font-semibold">{arg.confidence}%</span>
          </div>
          <Progress
            value={arg.confidence}
            className={`h-1.5 ${
              arg.vote === "buy" ? "[&>div]:bg-green-500" :
              arg.vote === "sell" ? "[&>div]:bg-red-500" :
              "[&>div]:bg-gray-400"
            }`}
          />
          {arg.llmProvider && (
            <p className="text-[9px] text-gray-300 mt-1 truncate">{arg.llmProvider}</p>
          )}
        </div>
      )}

      {/* Expanded argument */}
      {arg && expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/60 pt-2">
          <p className="text-xs text-gray-700 leading-relaxed">{arg.argument}</p>
          {arg.keyPoints.length > 0 && (
            <ul className="space-y-1">
              {arg.keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                  <span className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                    arg.vote === "buy" ? "bg-green-500" :
                    arg.vote === "sell" ? "bg-red-500" : "bg-gray-400"
                  }`} />
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Waiting placeholder */}
      {isWaiting && !arg && (
        <div className="px-3 pb-3">
          <div className="h-2 bg-gray-200 rounded animate-pulse w-3/4 mb-1.5" />
          <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
}

// ─── Vote tally bar ───────────────────────────────────────────────────────────

function VoteTally({ args }: { args: AgentArgument[] }) {
  const panel = args.filter((a) => a.role !== "moderator");
  const buy  = panel.filter((a) => a.vote === "buy").length;
  const sell = panel.filter((a) => a.vote === "sell").length;
  const hold = panel.filter((a) => a.vote === "hold").length;
  const total = panel.length;
  if (total === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Panel Vote Tally</p>
      <div className="flex gap-2 items-center">
        {/* BUY */}
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-green-700">BUY</span>
            <span className="text-green-700 font-bold">{buy}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${(buy / total) * 100}%` }}
            />
          </div>
        </div>
        {/* HOLD */}
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-600">HOLD</span>
            <span className="text-gray-600 font-bold">{hold}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-400 rounded-full transition-all duration-700"
              style={{ width: `${(hold / total) * 100}%` }}
            />
          </div>
        </div>
        {/* SELL */}
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-red-700">SELL</span>
            <span className="text-red-700 font-bold">{sell}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-700"
              style={{ width: `${(sell / total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Verdict card ─────────────────────────────────────────────────────────────

function VerdictCard({ session }: { session: DebateSession }) {
  const v = session.verdict;
  if (!v) return null;

  const actionColor =
    v.finalAction === "buy"  ? "from-green-500 to-emerald-600" :
    v.finalAction === "sell" ? "from-red-500 to-rose-600"      :
                               "from-gray-400 to-gray-500";

  const elapsed = session.completedAt
    ? ((session.completedAt - session.startedAt) / 1000).toFixed(1)
    : "?";

  return (
    <div className="rounded-xl overflow-hidden border-2 border-purple-300 shadow-lg shadow-purple-100">
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${actionColor} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            <span className="font-bold text-base">Final Verdict</span>
          </div>
          <div className="flex items-center gap-2">
            {consensusBadge(v.consensusLevel)}
            <span className="text-white/70 text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />{elapsed}s
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-4xl font-black">{VOTE_LABEL[v.finalAction]}</span>
          <span className="text-white/80 text-sm">{v.finalConfidence}% confidence</span>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white p-4 space-y-3">
        <p className="text-sm text-gray-700 leading-relaxed">{v.reasoning}</p>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-green-50 border border-green-100 py-2">
            <div className="text-xl font-bold text-green-700">{v.voteBreakdown.buy}</div>
            <div className="text-[10px] text-green-600 font-medium">BUY votes</div>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 py-2">
            <div className="text-xl font-bold text-gray-600">{v.voteBreakdown.hold}</div>
            <div className="text-[10px] text-gray-500 font-medium">HOLD votes</div>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 py-2">
            <div className="text-xl font-bold text-red-700">{v.voteBreakdown.sell}</div>
            <div className="text-[10px] text-red-600 font-medium">SELL votes</div>
          </div>
        </div>

        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
          v.shouldExecute
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}>
          {v.shouldExecute
            ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> Trade approved — confidence and consensus threshold met</>
            : <><Zap className="h-4 w-4 shrink-0" /> Trade blocked — confidence or consensus below threshold</>
          }
        </div>
      </div>
    </div>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ session, onReview }: { session: DebateSession; onReview: () => void }) {
  const v = session.verdict;
  const ago = session.startedAt
    ? (() => {
        const diff = Date.now() - session.startedAt;
        const mins = Math.round(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        return `${Math.round(mins / 60)}h ago`;
      })()
    : "";

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onReview}
    >
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            v?.finalAction === "buy"  ? "bg-green-50 text-green-700 border-green-200" :
            v?.finalAction === "sell" ? "bg-red-50 text-red-700 border-red-200"       :
                                        "bg-gray-50 text-gray-600 border-gray-200"
          }`}
        >
          {v ? VOTE_LABEL[v.finalAction] : "—"}
        </span>
        <div>
          <div className="text-sm font-medium text-gray-800">{session.assetName}</div>
          <div className="text-[10px] text-gray-400">
            {v ? `${v.finalConfidence}% confidence · ${v.consensusLevel}` : "incomplete"} · {ago}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {session.arguments
          .filter((a) => a.role !== "moderator")
          .map((a) => (
            <span
              key={a.role}
              title={`${DEBATE_AGENTS[a.role].name}: ${a.vote}`}
              className={`text-xs px-1.5 py-0.5 rounded border ${VOTE_COLOR[a.vote]}`}
            >
              {DEBATE_AGENTS[a.role].emoji}
            </span>
          ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgentDebatePanel() {
  const { toast } = useToast();
  const [selectedAssetId, setSelectedAssetId] = useState("bitcoin");
  const [view, setView] = useState<"debate" | "history">("debate");

  // Active debate state
  const [session, setSession] = useState<DebateSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fetchingMarket, setFetchingMarket] = useState(false);

  // History
  const [history, setHistory] = useState<DebateSession[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadDebateHistory());
  }, []);

  const selectedAsset = AVAILABLE_ASSETS.find((a) => a.id === selectedAssetId) ?? AVAILABLE_ASSETS[0];

  const handleStartDebate = async () => {
    const config = loadAgentConfig();

    // NVIDIA key is baked into API_KEYS — always available.
    // Only warn if neither NVIDIA nor Groq is configured.
    const nvidiaKey = process.env.NEXT_PUBLIC_NVIDIA_API_KEY || "";
    const groqKey   = (config.groqApiKey && config.groqApiKey !== "YOUR_GROQ_API_KEY")
      ? config.groqApiKey
      : (process.env.NEXT_PUBLIC_GROQ_API_KEY || "");

    // We pass a dummy string — llm-client picks the real key from API_KEYS automatically
    const apiKey = nvidiaKey || groqKey || "auto";

    setIsRunning(true);
    setFetchingMarket(true);
    setSession(null);

    try {
      // 1. Get live price
      const [cryptoData, stockData] = await Promise.all([
        fetchRealTimeCryptoData().catch(() => []),
        fetchRealTimeStockData().catch(() => []),
      ]);

      const allMarket = new Map<string, { price: number; name: string; type: "stock" | "crypto" }>();
      for (const s of stockData) {
        const id = typeof s.id === "string" ? s.id.split(".")[0] : String(s.id);
        allMarket.set(id, { price: s.price, name: s.name, type: "stock" });
        if (s.ticker) allMarket.set(s.ticker, { price: s.price, name: s.name, type: "stock" });
      }
      for (const c of cryptoData) {
        allMarket.set(c.id, { price: c.price, name: c.name, type: "crypto" });
      }

      const market = allMarket.get(selectedAssetId);
      const price = market?.price ?? 0;

      // 2. Fetch news
      const news = await fetchFinancialNews(config.newsApiKey, 10).catch(() => []);
      const newsSummary = buildNewsSummaryForAsset(news, selectedAssetId);

      setFetchingMarket(false);

      // 3. Run debate with live progress updates
      await runDebate(
        selectedAssetId,
        selectedAsset.label,
        selectedAsset.type,
        price,
        newsSummary,
        config.riskLevel,
        apiKey,
        (updatedSession) => {
          setSession({ ...updatedSession });
        }
      );

      setHistory(loadDebateHistory());
      toast({ title: "⚖️ Debate complete", description: `${selectedAsset.label} — verdict ready` });
    } catch (err) {
      toast({
        title: "Debate failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setFetchingMarket(false);
    }
  };

  const handleReviewSession = (s: DebateSession) => {
    setSession(s);
    setView("debate");
  };

  const panelRoles: DebateAgentRole[] = ["bull", "bear", "risk", "quant"];
  const argMap = new Map(session?.arguments.map((a) => [a.role, a]) ?? []);
  const moderatorArg = argMap.get("moderator");
  const panelComplete = panelRoles.every((r) => argMap.has(r));

  const totalSteps = 5; // 4 panel + 1 moderator
  const completedSteps = session?.arguments.length ?? 0;
  const progressPct = (completedSteps / totalSteps) * 100;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">Multi-Agent Debate</h3>
            <p className="text-sm text-gray-500">
              4 specialist AIs argue for and against a trade · Moderator delivers the verdict
            </p>
            {(() => {
              const p = getActiveProvider();
              return (
                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  p.provider === "nvidia"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {p.provider === "nvidia" ? "⚡" : "🤖"} {p.label}
                </span>
              );
            })()}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView("debate")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === "debate" ? "bg-purple-100 text-purple-800" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" /> Debate</span>
          </button>
          <button
            onClick={() => setView("history")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === "history" ? "bg-purple-100 text-purple-800" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> History
              {history.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-full px-1.5">{history.length}</span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* ══════════════════ DEBATE VIEW ══════════════════ */}
      {view === "debate" && (
        <div className="space-y-5">
          {/* Asset selector + launch */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Asset to debate</label>
                  <Select
                    value={selectedAssetId}
                    onValueChange={setSelectedAssetId}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 pt-1 pb-0.5">Crypto</p>
                      {AVAILABLE_ASSETS.filter((a) => a.type === "crypto").map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                      ))}
                      <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 pt-2 pb-0.5">Indian Stocks</p>
                      {AVAILABLE_ASSETS.filter((a) => a.type === "stock").map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleStartDebate}
                  disabled={isRunning}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-9 px-6 shrink-0"
                >
                  {isRunning ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Debating…</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" /> Start Debate</>
                  )}
                </Button>
              </div>

              {/* How it works pill list */}
              {!session && !isRunning && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.values(DEBATE_AGENTS).map((a) => (
                    <span
                      key={a.role}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${a.color} ${a.textColor} ${a.borderColor}`}
                    >
                      {a.emoji} {a.name}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress bar while running */}
          {isRunning && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {fetchingMarket
                    ? "Fetching market data & news…"
                    : completedSteps < 4
                    ? `Panel deliberating… (${completedSteps}/4 agents done)`
                    : "Moderator delivering verdict…"}
                </span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <Progress value={fetchingMarket ? 5 : progressPct} className="h-2" />
            </div>
          )}

          {/* Debate board */}
          {session && (
            <div className="space-y-5" ref={scrollRef}>
              {/* Asset context pill */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {session.assetName}
                </Badge>
                {session.currentPrice > 0 && (
                  <Badge variant="outline" className="text-xs">
                    ₹{session.currentPrice.toLocaleString("en-IN")}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${
                    session.status === "complete" ? "border-green-300 text-green-700 bg-green-50" :
                    session.status === "debating" ? "border-blue-300 text-blue-700 bg-blue-50 animate-pulse" :
                    "border-gray-200 text-gray-600"
                  }`}
                >
                  {session.status === "debating" ? "⚡ Live debate" : "✅ Complete"}
                </Badge>
              </div>

              {/* 4-panel agent grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {panelRoles.map((role) => (
                  <AgentCard
                    key={role}
                    role={role}
                    arg={argMap.get(role)}
                    isWaiting={isRunning && !argMap.has(role)}
                  />
                ))}
              </div>

              {/* Vote tally (shows as panel agents complete) */}
              {argMap.size >= 2 && <VoteTally args={session.arguments} />}

              {/* Moderator card */}
              <div className="relative">
                {panelComplete && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full z-10">
                    MODERATOR
                  </div>
                )}
                <AgentCard
                  role="moderator"
                  arg={moderatorArg}
                  isWaiting={isRunning && panelComplete && !moderatorArg}
                />
              </div>

              {/* Final verdict */}
              {session.verdict && <VerdictCard session={session} />}
            </div>
          )}

          {/* Empty state */}
          {!session && !isRunning && (
            <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-500">Select an asset and start the debate</p>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Bull, Bear, Risk Manager, and Quant Strategist will each argue their case. The Moderator delivers the final verdict.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ HISTORY VIEW ══════════════════ */}
      {view === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{history.length} past debate{history.length !== 1 ? "s" : ""}</p>
            {history.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7 text-gray-500"
                onClick={() => { clearDebateHistory(); setHistory([]); }}
              >
                <Trash2 className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No debate history yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[480px] pr-1">
              <div className="space-y-2">
                {history.map((s) => (
                  <HistoryRow key={s.id} session={s} onReview={() => handleReviewSession(s)} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* How it works footer */}
      <div className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-1">
        <p className="font-medium text-gray-500">How the debate works</p>
        <p>
          🐂 <strong>Bull</strong> and 🐻 <strong>Bear</strong> argue from opposing sides simultaneously.
          🛡️ <strong>Risk Manager</strong> focuses purely on downside and capital protection.
          📊 <strong>Quant</strong> cites only technical and statistical signals.
          ⚖️ <strong>Moderator</strong> reads all 4 transcripts and delivers a binding verdict.
          A trade is only approved when confidence ≥ 65% and consensus is majority or unanimous.
        </p>
      </div>
    </div>
  );
}
