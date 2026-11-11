"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  AgentLogEntry,
  TradeDecision,
  loadAgentLog,
  clearAgentLog,
  seedSampleJournalTrades,
} from "@/lib/trading-agent";
import {
  BookOpen,
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Newspaper,
  ShieldCheck,
  Search,
  Trash2,
  PlusCircle,
  Coins,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Zap,
  ArrowRight,
} from "lucide-react";

interface JournalEntry {
  id: string;
  timestamp: number;
  message: string;
  decision: TradeDecision;
}

export default function TradeJournal({
  onNavigateToConfig,
}: {
  onNavigateToConfig?: () => void;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | "buy" | "sell">("all");
  const [assetTypeFilter, setAssetTypeFilter] = useState<"all" | "stock" | "crypto">("all");

  const refreshEntries = () => {
    const rawLog = loadAgentLog();
    const tradeEntries: JournalEntry[] = rawLog
      .filter(
        (entry): entry is AgentLogEntry & { decision: TradeDecision } =>
          entry.type === "trade" && !!entry.decision
      )
      .map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        message: e.message,
        decision: e.decision,
      }));
    setEntries(tradeEntries);
  };

  useEffect(() => {
    refreshEntries();
    // Auto-poll journal updates every 3 seconds to stay fresh with running agent
    const id = setInterval(refreshEntries, 3000);
    return () => clearInterval(id);
  }, []);

  const handleSeedSamples = () => {
    seedSampleJournalTrades();
    refreshEntries();
    toast({
      title: "Sample trades loaded",
      description: "Added 4 realistic agent trading decisions with plain-English rationales.",
    });
  };

  const handleClearJournal = () => {
    clearAgentLog();
    setEntries([]);
    toast({
      title: "Journal cleared",
      description: "All trading agent activity and journal logs have been reset.",
    });
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      const d = item.decision;
      const matchesSearch =
        d.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.reasoning.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.newsHeadlines.some((h) => h.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction =
        actionFilter === "all" ? true : d.action === actionFilter;

      const matchesAssetType =
        assetTypeFilter === "all" ? true : d.assetType === assetTypeFilter;

      return matchesSearch && matchesAction && matchesAssetType;
    });
  }, [entries, searchTerm, actionFilter, assetTypeFilter]);

  // Summary statistics
  const totalTrades = entries.length;
  const buyTrades = entries.filter((e) => e.decision.action === "buy").length;
  const sellTrades = entries.filter((e) => e.decision.action === "sell").length;
  const avgConfidence =
    totalTrades > 0
      ? Math.round(
          entries.reduce((acc, curr) => acc + (curr.decision.confidence || 0), 0) /
            totalTrades
        )
      : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: val < 100 ? 2 : 0,
    }).format(val);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMin = Math.round((now - timestamp) / (1000 * 60));

    let relative = "";
    if (diffMin < 1) relative = "Just now";
    else if (diffMin === 1) relative = "1 minute ago";
    else if (diffMin < 60) relative = `${diffMin} minutes ago`;
    else {
      const diffHours = Math.round(diffMin / 60);
      if (diffHours === 1) relative = "1 hour ago";
      else if (diffHours < 24) relative = `${diffHours} hours ago`;
      else relative = `${Math.round(diffHours / 24)} days ago`;
    }

    const formattedTime = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedDate = date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return { relative, full: `${formattedDate} at ${formattedTime}` };
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 leading-tight">
              Agent Trade Journal
            </h3>
            <p className="text-sm text-gray-500">
              Plain-English explanations of why the AI made each trade and the market thinking behind it
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSeedSamples}
            className="gap-1.5 text-xs h-8 border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Sample Trades
          </Button>
          {entries.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearJournal}
              className="gap-1.5 text-xs h-8 text-gray-600 hover:text-red-600 hover:border-red-200"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-gray-100 bg-white">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500 mb-1">Total Documented Trades</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{totalTrades}</span>
              <span className="text-xs text-gray-400">decisions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-green-50/40">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <span>Buy Decisions</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-700">{buyTrades}</span>
              <span className="text-xs text-green-600 font-medium">
                {totalTrades > 0 ? `${Math.round((buyTrades / totalTrades) * 100)}%` : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-red-50/40">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1 text-xs text-red-700 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              <span>Sell / Exit Decisions</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-700">{sellTrades}</span>
              <span className="text-xs text-red-600 font-medium">
                {totalTrades > 0 ? `${Math.round((sellTrades / totalTrades) * 100)}%` : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-purple-50/40">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1 text-xs text-purple-700 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>Avg AI Confidence</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-700">
                {avgConfidence > 0 ? `${avgConfidence}%` : "—"}
              </span>
              <span className="text-xs text-purple-600">conviction</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-gray-50/80 p-3 rounded-xl border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by asset, reasoning, or news keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={actionFilter}
            onValueChange={(val) => setActionFilter(val as "all" | "buy" | "sell")}
          >
            <SelectTrigger className="w-[125px] h-9 text-xs bg-white">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="buy">Buys Only</SelectItem>
              <SelectItem value="sell">Sells Only</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={assetTypeFilter}
            onValueChange={(val) => setAssetTypeFilter(val as "all" | "stock" | "crypto")}
          >
            <SelectTrigger className="w-[125px] h-9 text-xs bg-white">
              <SelectValue placeholder="Asset Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="stock">Stocks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Journal Entries List ── */}
      {filteredEntries.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-800">
                {entries.length === 0 ? "No Journal Entries Yet" : "No Matches Found"}
              </h4>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                {entries.length === 0
                  ? "When the AI Auto-Trading Agent executes trades based on news sentiment and technical triggers, its plain-English reasoning will be automatically recorded here."
                  : "No trade journal entries match your current search and filter settings."}
              </p>
            </div>
            {entries.length === 0 && (
              <div className="flex justify-center gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={handleSeedSamples}
                  className="gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Load Sample Agent Trades
                </Button>
                {onNavigateToConfig && (
                  <Button size="sm" variant="outline" onClick={onNavigateToConfig}>
                    Configure Agent
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((item) => {
            const d = item.decision;
            const time = formatTimestamp(d.timestamp || item.timestamp);
            const isBuy = d.action === "buy";
            const isStopLoss = d.trigger === "stop_loss";
            const isTakeProfit = d.trigger === "take_profit";

            return (
              <Card
                key={item.id}
                className={`overflow-hidden transition-all duration-200 border hover:shadow-md ${
                  isBuy
                    ? "border-green-200/80 bg-white"
                    : isStopLoss
                    ? "border-red-200/80 bg-white"
                    : isTakeProfit
                    ? "border-amber-200/80 bg-white"
                    : "border-red-200/80 bg-white"
                }`}
              >
                {/* ── Top Header Bar ── */}
                <div
                  className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
                    isBuy
                      ? "bg-green-50/60 border-green-100"
                      : isStopLoss
                      ? "bg-red-50/60 border-red-100"
                      : isTakeProfit
                      ? "bg-amber-50/60 border-amber-100"
                      : "bg-red-50/60 border-red-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Action badge */}
                    {isBuy ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-600 text-white shadow-xs">
                        <TrendingUp className="h-3.5 w-3.5" />
                        BUY ORDER
                      </span>
                    ) : isStopLoss ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 text-white shadow-xs">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        STOP-LOSS EXIT
                      </span>
                    ) : isTakeProfit ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-600 text-white shadow-xs">
                        <Zap className="h-3.5 w-3.5" />
                        TAKE-PROFIT EXIT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 text-white shadow-xs">
                        <TrendingDown className="h-3.5 w-3.5" />
                        SELL ORDER
                      </span>
                    )}

                    {/* Asset Name */}
                    <span className="font-bold text-gray-900 text-base">
                      {d.assetName}
                    </span>

                    {/* Asset Type badge */}
                    <Badge
                      variant="outline"
                      className="text-[11px] gap-1 font-normal bg-white/80"
                    >
                      {d.assetType === "crypto" ? (
                        <>
                          <Coins className="h-3 w-3 text-purple-600" /> Crypto
                        </>
                      ) : (
                        <>
                          <Building2 className="h-3 w-3 text-blue-600" /> Stock
                        </>
                      )}
                    </Badge>

                    {/* Trigger Badge */}
                    {d.trigger && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase tracking-wider font-semibold"
                      >
                        {d.trigger === "news_sentiment"
                          ? "News & Sentiment"
                          : d.trigger === "stop_loss"
                          ? "Risk Protection"
                          : "Profit Target"}
                      </Badge>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span title={time.full}>{time.relative}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-400 text-[11px]">{time.full}</span>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* ── The Agent's Thinking (Plain-English Rationale) ── */}
                  <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                          <Brain className="h-4 w-4" />
                        </div>
                        <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                          Why the Agent Made This Trade (Thinking & Rationale)
                        </h4>
                      </div>
                      <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                        AI Reasoning
                      </span>
                    </div>

                    <p className="text-sm text-gray-800 leading-relaxed font-normal pl-0.5">
                      {d.reasoning || "Reasoning logged with trade execution."}
                    </p>
                  </div>

                  {/* ── Key Market News & Catalysts ── */}
                  {d.newsHeadlines && d.newsHeadlines.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                        <Newspaper className="h-3.5 w-3.5 text-gray-500" />
                        <span>Key Catalysts & News Headlines Analyzed:</span>
                      </div>
                      <div className="space-y-1">
                        {d.newsHeadlines.map((headline, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50/80 px-3 py-2 rounded-lg border border-gray-100"
                          >
                            <span className="text-purple-600 font-bold shrink-0 mt-0.5">
                              “
                            </span>
                            <span className="italic flex-1">{headline}</span>
                            <span className="text-purple-600 font-bold shrink-0 mt-0.5">
                              ”
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Execution & AI Confidence Metrics ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-[11px] text-gray-400">Execution Price</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(d.currentPrice)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-gray-400">Order Quantity</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {d.quantity} {d.assetType === "crypto" ? "units" : "shares"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-gray-400">Total Value Traded</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(d.totalValue)}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-gray-400">AI Confidence</span>
                        <span className="font-semibold text-purple-700">
                          {d.confidence}%
                        </span>
                      </div>
                      <Progress
                        value={d.confidence}
                        className="h-2 bg-gray-100"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

