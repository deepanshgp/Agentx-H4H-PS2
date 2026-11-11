// Trading Agent — core logic for the AI-powered auto-trader
// Flow: fetch news → Groq (LLaMA 3.3 70B) sentiment analysis → decision engine → execute trade → log activity

import { API_KEYS } from "@/config/api-keys";
import { fetchFinancialNews, buildNewsSummaryForAsset, NewsArticle } from "./news-service";
import { fetchRealTimeCryptoData, fetchRealTimeStockData } from "./market-api";
import { saveTransaction, getUserPortfolio, Asset } from "./portfolio-tracker";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = "conservative" | "moderate" | "aggressive";
export type TradeAction = "buy" | "sell" | "hold";
export type AgentStatus = "idle" | "running" | "paused" | "error";

export interface AgentConfig {
  enabled: boolean;
  riskLevel: RiskLevel;
  /** Max INR to spend per single trade */
  maxTradeAmountINR: number;
  /** Minimum confidence score (0–100) required to act */
  minConfidenceThreshold: number;
  /** How often to run a cycle, in minutes */
  intervalMinutes: number;
  /** Asset IDs the agent is allowed to trade */
  watchedAssets: string[];
  /** GNews API key */
  newsApiKey: string;
  /** Groq API key — free at https://console.groq.com */
  groqApiKey: string;
  /** Stop-loss: sell if loss exceeds this % */
  stopLossPercent: number;
  /** Take-profit: sell if gain exceeds this % */
  takeProfitPercent: number;
}

export interface TradeDecision {
  assetId: string;
  assetName: string;
  assetType: "stock" | "crypto";
  action: TradeAction;
  confidence: number;
  reasoning: string;
  newsHeadlines: string[];
  currentPrice: number;
  quantity: number;
  totalValue: number;
  timestamp: number;
  trigger?: "news_sentiment" | "stop_loss" | "take_profit";
  riskLevel?: RiskLevel;
}

export interface AgentLogEntry {
  id: string;
  timestamp: number;
  type: "info" | "trade" | "warn" | "error";
  message: string;
  decision?: TradeDecision;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: AgentConfig = {
  enabled: false,
  riskLevel: "moderate",
  maxTradeAmountINR: 5000,
  minConfidenceThreshold: 65,
  intervalMinutes: 5,
  watchedAssets: ["bitcoin", "ethereum", "RELIANCE", "INFY", "TCS"],
  newsApiKey: "YOUR_GNEWS_API_KEY",
  groqApiKey: API_KEYS.GROQ || "YOUR_GROQ_API_KEY",
  stopLossPercent: 5,
  takeProfitPercent: 10,
};

// ─── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  config: "agentConfig",
  log: "agentLog",
  status: "agentStatus",
};

export function loadAgentConfig(): AgentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.config);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAgentConfig(config: AgentConfig): void {
  localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
}

export function loadAgentLog(): AgentLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.log);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendLog(entry: Omit<AgentLogEntry, "id">): AgentLogEntry {
  const full: AgentLogEntry = { id: `log-${Date.now()}-${Math.random()}`, ...entry };
  const log = loadAgentLog();
  const trimmed = [full, ...log].slice(0, 200);
  localStorage.setItem(STORAGE_KEYS.log, JSON.stringify(trimmed));
  return full;
}

export function clearAgentLog(): void {
  localStorage.setItem(STORAGE_KEYS.log, JSON.stringify([]));
}

export function getAgentStatus(): AgentStatus {
  return (localStorage.getItem(STORAGE_KEYS.status) as AgentStatus) || "idle";
}

function setAgentStatus(status: AgentStatus): void {
  localStorage.setItem(STORAGE_KEYS.status, status);
}

// ─── Groq Sentiment Analysis (LLaMA 3.3 70B) ─────────────────────────────────

interface SentimentResult {
  action: TradeAction;
  confidence: number;
  reasoning: string;
}

async function analyzeNewsWithGroq(
  assetName: string,
  assetType: "stock" | "crypto",
  currentPrice: number,
  newsSummary: string,
  riskLevel: RiskLevel,
  groqApiKey: string
): Promise<SentimentResult> {
  const apiKey =
    process.env.NEXT_PUBLIC_GROQ_API_KEY ||
    groqApiKey ||
    API_KEYS.GROQ;

  if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") {
    return {
      action: "hold",
      confidence: 0,
      reasoning: "No Groq API key configured. Add your key in the Configure tab.",
    };
  }

  const riskContext = {
    conservative: "Only recommend BUY if sentiment is strongly positive (confidence ≥ 80). Prefer HOLD.",
    moderate:     "Recommend BUY for positive sentiment (confidence ≥ 65) and SELL for clearly negative sentiment.",
    aggressive:   "Recommend BUY for even mildly positive sentiment. Actively take both buy and sell positions.",
  }[riskLevel];

  const systemPrompt =
    "You are a disciplined quantitative trading agent. Your job is to analyze financial news and market signals and make CONSERVATIVE decisions. " +
    "IMPORTANT RULES: (1) If there is no concrete news or clear signal, you MUST respond with HOLD. " +
    "(2) Only recommend BUY when there is specific positive news or a strong technical catalyst — do NOT buy just because an asset is well-known. " +
    "(3) Only recommend SELL when there is specific negative news, deteriorating fundamentals, or a clear exit signal. " +
    "(4) A HOLD with high confidence is a valid and often correct answer. " +
    "Always respond with ONLY a valid JSON object — no markdown, no code fences, no extra text.";

  const hasRealNews = !newsSummary.includes("No recent news") && !newsSummary.includes("AI market knowledge");
  const noNewsInstruction = hasRealNews
    ? ""
    : "\nIMPORTANT: There is NO recent news available for this asset. Without a concrete catalyst, the correct answer is almost always HOLD. Only deviate if you have very strong fundamental reasons.";

  const userPrompt =
    `Asset: ${assetName} (${assetType})\n` +
    `Current Price: ₹${currentPrice.toLocaleString("en-IN")}\n` +
    `Risk Profile: ${riskLevel} — ${riskContext}\n` +
    noNewsInstruction + `\n\n` +
    `Market Context & News:\n${newsSummary}\n\n` +
    `Decide: BUY, SELL, or HOLD. If no news is available, default to HOLD unless there is a compelling fundamental reason.\n\n` +
    `Respond with exactly this JSON structure:\n` +
    `{"action":"buy"|"sell"|"hold","confidence":<0-100>,"reasoning":"<2-3 sentences explaining the specific catalysts, signals, or reasons. If holding due to lack of news, say so clearly.>"}`;

  try {
    let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    // Fallback to gpt-oss-120b if gpt-oss-20b has issues
    if (!response.ok && response.status !== 401 && response.status !== 403) {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt   },
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in Groq response");
    const parsed = JSON.parse(match[0]);

    return {
      action:     (parsed.action as TradeAction) ?? "hold",
      confidence: Number(parsed.confidence) || 50,
      reasoning:  parsed.reasoning || "",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[TradingAgent] Groq analysis failed:", msg);
    return { action: "hold", confidence: 0, reasoning: `Groq API error: ${msg}` };
  }
}

// ─── Trade Execution ──────────────────────────────────────────────────────────

function executeBuy(
  assetId: string,
  assetName: string,
  assetType: "stock" | "crypto",
  price: number,
  maxAmountINR: number,
  assetImage?: string
): { quantity: number; totalValue: number } | null {
  const portfolioKey = assetType === "stock" ? "userStocks" : "userCrypto";
  const portfolio: Asset[] = JSON.parse(localStorage.getItem(portfolioKey) || "[]");

  const balance = parseFloat(localStorage.getItem("inrBalance") || "100000");
  const spendAmount = Math.min(maxAmountINR, balance * 0.9);

  if (spendAmount < 1 || price <= 0) return null;

  const quantity = parseFloat((spendAmount / price).toFixed(assetType === "crypto" ? 6 : 2));
  const totalValue = parseFloat((quantity * price).toFixed(2));

  if (quantity <= 0) return null;

  const existing = portfolio.findIndex((a) => a.id === assetId);
  if (existing !== -1) {
    const prev = portfolio[existing];
    const newQty = prev.quantity + quantity;
    const newTotal = prev.totalValue + totalValue;
    portfolio[existing] = {
      ...prev,
      quantity: newQty,
      avgBuyPrice: newTotal / newQty,
      totalValue: newTotal,
      profit: price * newQty - newTotal,
      profitPercentage: ((price / (newTotal / newQty)) - 1) * 100,
    };
  } else {
    portfolio.push({
      id: assetId,
      name: assetName,
      ticker: assetId.toUpperCase(),
      quantity,
      price,
      avgBuyPrice: price,
      totalValue,
      profit: 0,
      profitPercentage: 0,
      ...(assetImage ? { image: assetImage } : {}),
    } as Asset & { ticker: string });
  }

  localStorage.setItem(portfolioKey, JSON.stringify(portfolio));

  const newBalance = balance - totalValue;
  localStorage.setItem("inrBalance", newBalance.toFixed(2));

  saveTransaction({
    id: `agent-buy-${Date.now()}`,
    assetId,
    assetName,
    assetType,
    type: "buy",
    quantity,
    price,
    totalValue,
    timestamp: Date.now(),
  });

  return { quantity, totalValue };
}

function executeSell(
  assetId: string,
  assetName: string,
  assetType: "stock" | "crypto",
  price: number,
  sellFraction: number = 1.0
): { quantity: number; totalValue: number } | null {
  const portfolioKey = assetType === "stock" ? "userStocks" : "userCrypto";
  const portfolio: Asset[] = JSON.parse(localStorage.getItem(portfolioKey) || "[]");
  const idx = portfolio.findIndex((a) => a.id === assetId);
  if (idx === -1) return null;

  const asset = portfolio[idx];
  const sellQty = parseFloat((asset.quantity * sellFraction).toFixed(assetType === "crypto" ? 6 : 2));
  if (sellQty <= 0) return null;

  const totalValue = parseFloat((sellQty * price).toFixed(2));
  const remaining = asset.quantity - sellQty;

  if (remaining <= 0.000001) {
    portfolio.splice(idx, 1);
  } else {
    const newTotal = asset.avgBuyPrice * remaining;
    portfolio[idx] = {
      ...asset,
      quantity: remaining,
      totalValue: newTotal,
      profit: price * remaining - newTotal,
      profitPercentage: ((price / asset.avgBuyPrice) - 1) * 100,
    };
  }

  localStorage.setItem(portfolioKey, JSON.stringify(portfolio));

  const balance = parseFloat(localStorage.getItem("inrBalance") || "0");
  localStorage.setItem("inrBalance", (balance + totalValue).toFixed(2));

  saveTransaction({
    id: `agent-sell-${Date.now()}`,
    assetId,
    assetName,
    assetType,
    type: "sell",
    quantity: sellQty,
    price,
    totalValue,
    timestamp: Date.now(),
  });

  return { quantity: sellQty, totalValue };
}

// ─── Stop-loss / Take-profit checker ─────────────────────────────────────────

async function checkStopLossTakeProfit(
  config: AgentConfig,
  marketDataMap: Map<string, { price: number; name: string; type: "stock" | "crypto" }>
): Promise<void> {
  const { stocks, crypto } = getUserPortfolio();
  const allAssets = [
    ...stocks.map((a) => ({ ...a, type: "stock" as const })),
    ...crypto.map((a) => ({ ...a, type: "crypto" as const })),
  ];

  for (const asset of allAssets) {
    const market = marketDataMap.get(asset.id);
    if (!market) continue;

    const pnlPct = ((market.price - asset.avgBuyPrice) / asset.avgBuyPrice) * 100;

    if (pnlPct <= -config.stopLossPercent) {
      appendLog({
        timestamp: Date.now(),
        type: "warn",
        message: `🛑 Stop-loss triggered for ${asset.name} (${pnlPct.toFixed(1)}% loss). Selling all.`,
      });
      const result = executeSell(asset.id, asset.name, asset.type, market.price, 1.0);
      if (result) {
        const decision: TradeDecision = {
          assetId: asset.id,
          assetName: asset.name,
          assetType: asset.type,
          action: "sell",
          confidence: 100,
          reasoning: `Automated stop-loss triggered: ${asset.name} declined by ${Math.abs(pnlPct).toFixed(1)}%, breaching the maximum allowable loss threshold of ${config.stopLossPercent}%. The agent executed a full exit to protect capital and prevent further portfolio drawdown.`,
          newsHeadlines: [`Risk protection rule executed: asset dropped ${Math.abs(pnlPct).toFixed(1)}% below average purchase price`],
          currentPrice: market.price,
          quantity: result.quantity,
          totalValue: result.totalValue,
          timestamp: Date.now(),
          trigger: "stop_loss",
          riskLevel: config.riskLevel,
        };
        appendLog({
          timestamp: Date.now(),
          type: "trade",
          message: `🔴 SELL (stop-loss) ${result.quantity} ${asset.name} @ ₹${market.price.toLocaleString("en-IN")} = ₹${result.totalValue.toLocaleString("en-IN")}`,
          decision,
        });
      }
    } else if (pnlPct >= config.takeProfitPercent) {
      appendLog({
        timestamp: Date.now(),
        type: "warn",
        message: `✅ Take-profit triggered for ${asset.name} (+${pnlPct.toFixed(1)}% gain). Selling 50%.`,
      });
      const result = executeSell(asset.id, asset.name, asset.type, market.price, 0.5);
      if (result) {
        const decision: TradeDecision = {
          assetId: asset.id,
          assetName: asset.name,
          assetType: asset.type,
          action: "sell",
          confidence: 100,
          reasoning: `Automated take-profit executed: ${asset.name} reached a +${pnlPct.toFixed(1)}% unrealized gain, reaching the ${config.takeProfitPercent}% target milestone. The agent trimmed 50% of the position to secure realized profit in cash while keeping remaining shares to capture potential upside.`,
          newsHeadlines: [`Profit harvest target achieved: asset gained +${pnlPct.toFixed(1)}%`],
          currentPrice: market.price,
          quantity: result.quantity,
          totalValue: result.totalValue,
          timestamp: Date.now(),
          trigger: "take_profit",
          riskLevel: config.riskLevel,
        };
        appendLog({
          timestamp: Date.now(),
          type: "trade",
          message: `🟡 SELL (take-profit) ${result.quantity} ${asset.name} @ ₹${market.price.toLocaleString("en-IN")} = ₹${result.totalValue.toLocaleString("en-IN")}`,
          decision,
        });
      }
    }
  }
}

// ─── Main Agent Cycle ─────────────────────────────────────────────────────────

export async function runAgentCycle(
  config: AgentConfig,
  onLog?: (entry: AgentLogEntry) => void
): Promise<void> {
  const log = (type: AgentLogEntry["type"], message: string, decision?: TradeDecision) => {
    const entry = appendLog({ timestamp: Date.now(), type, message, decision });
    onLog?.(entry);
  };

  log("info", "🤖 Agent cycle started — fetching market data and news…");

  // 1. Fetch live market data
  const [cryptoMarket, stockMarket] = await Promise.all([
    fetchRealTimeCryptoData().catch(() => []),
    fetchRealTimeStockData().catch(() => []),
  ]);

  // Build lookup map: assetId → { price, name, type }
  const marketDataMap = new Map<string, { price: number; name: string; type: "stock" | "crypto"; image?: string }>();

  for (const s of stockMarket) {
    const id = typeof s.id === "string" ? s.id.split(".")[0] : String(s.id);
    marketDataMap.set(id, { price: s.price, name: s.name, type: "stock" });
    if (s.ticker) marketDataMap.set(s.ticker, { price: s.price, name: s.name, type: "stock" });
  }
  for (const c of cryptoMarket) {
    marketDataMap.set(c.id, { price: c.price, name: c.name, type: "crypto", image: c.image });
  }

  // 2. Check stop-loss / take-profit first
  await checkStopLossTakeProfit(config, marketDataMap);

  // 3. Fetch financial news
  log("info", "📰 Fetching financial news…");
  const news: NewsArticle[] = await fetchFinancialNews(config.newsApiKey, 15);
  log("info", `📰 Retrieved ${news.length} relevant news articles`);

  // 4. Analyse each watched asset
  for (const assetId of config.watchedAssets) {
    const market = marketDataMap.get(assetId);
    if (!market || !market.price) {
      log("warn", `⚠️ No market data for ${assetId} — skipping`);
      continue;
    }

    const newsSummary = buildNewsSummaryForAsset(news, assetId);
    const hasNews = !newsSummary.includes("No recent news");

    // Always ask the LLM — fall back to general market knowledge when no headlines
    const contextForLLM = hasNews
      ? newsSummary
      : `No recent news headlines found for ${market.name} in this cycle. No specific catalyst has been identified. Only recommend BUY or SELL if you can cite a concrete, specific reason — otherwise respond with HOLD.`;

    log("info", `🔍 Analysing ${market.name} with Groq LLaMA${hasNews ? " (live news)" : " (AI market knowledge)"}…`);

    const sentiment = await analyzeNewsWithGroq(
      market.name,
      market.type,
      market.price,
      contextForLLM,
      config.riskLevel,
      config.groqApiKey
    );

    // 5. Confidence gate
    if (sentiment.confidence < config.minConfidenceThreshold && sentiment.action !== "hold") {
      log(
        "info",
        `⏸ ${market.name}: ${sentiment.action.toUpperCase()} signal but confidence ${sentiment.confidence}% < threshold ${config.minConfidenceThreshold}% — holding`
      );
      continue;
    }

    // 6. Execute trade
    if (sentiment.action === "buy") {
      const result = executeBuy(
        assetId,
        market.name,
        market.type,
        market.price,
        config.maxTradeAmountINR,
        market.image
      );

      if (result) {
        const decision: TradeDecision = {
          assetId,
          assetName: market.name,
          assetType: market.type,
          action: "buy",
          confidence: sentiment.confidence,
          reasoning: sentiment.reasoning,
          newsHeadlines: news.filter((n) => n.relatedAssets.includes(assetId)).map((n) => n.title),
          currentPrice: market.price,
          quantity: result.quantity,
          totalValue: result.totalValue,
          timestamp: Date.now(),
          trigger: "news_sentiment",
          riskLevel: config.riskLevel,
        };
        log(
          "trade",
          `🟢 BUY ${result.quantity} ${market.name} @ ₹${market.price.toLocaleString("en-IN")} = ₹${result.totalValue.toLocaleString("en-IN")} (confidence: ${sentiment.confidence}%)`,
          decision
        );
      } else {
        log("warn", `⚠️ BUY for ${market.name} skipped — insufficient balance or zero quantity`);
      }
    } else if (sentiment.action === "sell") {
      const { stocks, crypto } = getUserPortfolio();
      const holding = [...stocks, ...crypto].find((a) => a.id === assetId);

      if (!holding) {
        log("info", `ℹ️ SELL signal for ${market.name} but no holdings — skipping`);
        continue;
      }

      const sellFraction = config.riskLevel === "aggressive" ? 1.0 : 0.5;
      const result = executeSell(assetId, market.name, market.type, market.price, sellFraction);

      if (result) {
        const decision: TradeDecision = {
          assetId,
          assetName: market.name,
          assetType: market.type,
          action: "sell",
          confidence: sentiment.confidence,
          reasoning: sentiment.reasoning,
          newsHeadlines: news.filter((n) => n.relatedAssets.includes(assetId)).map((n) => n.title),
          currentPrice: market.price,
          quantity: result.quantity,
          totalValue: result.totalValue,
          timestamp: Date.now(),
          trigger: "news_sentiment",
          riskLevel: config.riskLevel,
        };
        log(
          "trade",
          `🔴 SELL ${result.quantity} ${market.name} @ ₹${market.price.toLocaleString("en-IN")} = ₹${result.totalValue.toLocaleString("en-IN")} (confidence: ${sentiment.confidence}%)`,
          decision
        );
      }
    } else {
      log(
        "info",
        `⏸ HOLD ${market.name} — ${sentiment.reasoning} (confidence: ${sentiment.confidence}%)`
      );
    }

    // Small delay to stay within Groq rate limits (free tier: 30 req/min)
    await new Promise((r) => setTimeout(r, 500));
  }

  log("info", "✅ Agent cycle complete");
}

// ─── Interval runner (singleton) ─────────────────────────────────────────────

let _intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startAgent(
  config: AgentConfig,
  onLog: (entry: AgentLogEntry) => void,
  onStatusChange: (status: AgentStatus) => void
): void {
  if (_intervalHandle !== null) return;

  setAgentStatus("running");
  onStatusChange("running");

  const run = async () => {
    if (getAgentStatus() !== "running") return;
    try {
      await runAgentCycle(config, onLog);
    } catch (err) {
      console.error("[TradingAgent] Cycle error:", err);
      const entry = appendLog({
        timestamp: Date.now(),
        type: "error",
        message: `❌ Agent cycle error: ${(err as Error).message}`,
      });
      onLog(entry);
    }
  };

  run();
  _intervalHandle = setInterval(run, config.intervalMinutes * 60 * 1000);
}

export function stopAgent(onStatusChange: (status: AgentStatus) => void): void {
  if (_intervalHandle !== null) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
  }
  setAgentStatus("idle");
  onStatusChange("idle");
  appendLog({ timestamp: Date.now(), type: "info", message: "🛑 Agent stopped by user" });
}

export function isAgentRunning(): boolean {
  return _intervalHandle !== null;
}

// ─── Journal helpers ─────────────────────────────────────────────────────────

export function getAgentTradeDecisions(): TradeDecision[] {
  const log = loadAgentLog();
  return log
    .filter((entry): entry is AgentLogEntry & { decision: TradeDecision } => entry.type === "trade" && !!entry.decision)
    .map((e) => e.decision);
}

export function seedSampleJournalTrades(): void {
  const existingLog = loadAgentLog();
  const sampleEntries: AgentLogEntry[] = [
    {
      id: `sample-trade-1-${Date.now()}`,
      timestamp: Date.now() - 1000 * 60 * 14,
      type: "trade",
      message: "🟢 BUY 0.0035 Bitcoin @ ₹7,140,000 = ₹24,990 (confidence: 88%)",
      decision: {
        assetId: "bitcoin",
        assetName: "Bitcoin (BTC)",
        assetType: "crypto",
        action: "buy",
        confidence: 88,
        reasoning: "The agent detected strong institutional accumulation following a $420M surge in spot Bitcoin ETF inflows, with prices breaking cleanly above the ₹7,000,000 resistance band. Technical momentum and expanding network transaction volume indicate high probability of sustained short-term upside with favorable risk-reward asymmetry.",
        newsHeadlines: [
          "Bitcoin surges past $70,000 as institutional demand grows",
          "Crypto ETF net inflows hit four-week record amid global macro optimism"
        ],
        currentPrice: 7140000,
        quantity: 0.0035,
        totalValue: 24990,
        timestamp: Date.now() - 1000 * 60 * 14,
        trigger: "news_sentiment",
        riskLevel: "moderate",
      },
    },
    {
      id: `sample-trade-2-${Date.now()}`,
      timestamp: Date.now() - 1000 * 60 * 48,
      type: "trade",
      message: "🟢 BUY 10 Reliance Industries @ ₹2,980 = ₹29,800 (confidence: 82%)",
      decision: {
        assetId: "RELIANCE",
        assetName: "Reliance Industries (RELIANCE)",
        assetType: "stock",
        action: "buy",
        confidence: 82,
        reasoning: "The agent initiated a buy position after Reliance reported quarterly net profit growth driven by record telecom ARPU expansion and high retail margins. The core business fundamentals demonstrate resilient cash flows and defensive strength, offering solid capital appreciation potential.",
        newsHeadlines: [
          "Reliance Industries reports record quarterly profits",
          "Telecom and retail segments deliver double-digit revenue expansion"
        ],
        currentPrice: 2980,
        quantity: 10,
        totalValue: 29800,
        timestamp: Date.now() - 1000 * 60 * 48,
        trigger: "news_sentiment",
        riskLevel: "moderate",
      },
    },
    {
      id: `sample-trade-3-${Date.now()}`,
      timestamp: Date.now() - 1000 * 60 * 110,
      type: "trade",
      message: "🟡 SELL (take-profit) 0.05 Ethereum @ ₹312,000 = ₹15,600",
      decision: {
        assetId: "ethereum",
        assetName: "Ethereum (ETH)",
        assetType: "crypto",
        action: "sell",
        confidence: 95,
        reasoning: "Automated take-profit executed: Ethereum achieved a +14.2% price appreciation, reaching the target profit milestone (+10%). The agent trimmed 50% of holdings to lock in guaranteed profit to cash while keeping the remaining position active to capture extended breakout potential.",
        newsHeadlines: [
          "Ethereum network upgrade boosts transaction throughput and layer-2 adoption",
          "Take-profit milestone triggered: asset gained more than +10%"
        ],
        currentPrice: 312000,
        quantity: 0.05,
        totalValue: 15600,
        timestamp: Date.now() - 1000 * 60 * 110,
        trigger: "take_profit",
        riskLevel: "moderate",
      },
    },
    {
      id: `sample-trade-4-${Date.now()}`,
      timestamp: Date.now() - 1000 * 60 * 220,
      type: "trade",
      message: "🔴 SELL 6 HDFC Bank @ ₹1,720 = ₹10,320 (confidence: 76%)",
      decision: {
        assetId: "HDFCBANK",
        assetName: "HDFC Bank (HDFCBANK)",
        assetType: "stock",
        action: "sell",
        confidence: 76,
        reasoning: "The agent recommended a tactical SELL on HDFC Bank following reports of moderating loan disbursement growth and net interest margin compression in the banking sector. Liquidating shares into cash mitigates sector risk and frees up liquidity for high-growth momentum opportunities.",
        newsHeadlines: [
          "HDFC Bank sees slowdown in loan growth amid rising interest rates"
        ],
        currentPrice: 1720,
        quantity: 6,
        totalValue: 10320,
        timestamp: Date.now() - 1000 * 60 * 220,
        trigger: "news_sentiment",
        riskLevel: "moderate",
      },
    },
  ];

  localStorage.setItem(STORAGE_KEYS.log, JSON.stringify([...sampleEntries, ...existingLog].slice(0, 200)));
}
