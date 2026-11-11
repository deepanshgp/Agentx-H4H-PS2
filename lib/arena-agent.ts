// Arena Mode — isolated survival trading session
// The agent gets a fixed budget and must trade to survive.
// It learns from P&L after every trade. When balance hits zero, the session ends.

import { API_KEYS } from "@/config/api-keys";
import { fetchFinancialNews, buildNewsSummaryForAsset, NewsArticle } from "./news-service";
import { fetchRealTimeCryptoData, fetchRealTimeStockData } from "./market-api";
import { RiskLevel, TradeAction } from "./trading-agent";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArenaConfig {
  startingBalance: number;       // INR the agent starts with
  riskLevel: RiskLevel;
  watchedAssets: string[];
  intervalMinutes: number;
  groqApiKey: string;
  newsApiKey: string;
  minConfidenceThreshold: number;
}

export interface ArenaHolding {
  assetId: string;
  assetName: string;
  assetType: "stock" | "crypto";
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealisedPnl: number;
  unrealisedPnlPct: number;
}

export interface ArenaTrade {
  id: string;
  timestamp: number;
  assetId: string;
  assetName: string;
  assetType: "stock" | "crypto";
  action: "buy" | "sell";
  price: number;
  quantity: number;
  totalValue: number;
  confidence: number;
  reasoning: string;         // what the agent said at decision time
  newsHeadlines: string[];
  // Filled in after price moves
  outcome?: "profit" | "loss" | "neutral";
  realisedPnl?: number;
  realisedPnlPct?: number;
  // What the agent learned from this trade
  lesson?: string;
}

export interface ArenaMemory {
  // Running list of lessons learned from closed trades
  lessons: string[];
  // Win/loss streak for weighting future confidence
  recentOutcomes: Array<"profit" | "loss" | "neutral">;
  winRate: number;            // 0–100
  avgPnlPct: number;          // average realised PnL %
}

export type ArenaStatus = "idle" | "running" | "dead" | "won";

export interface ArenaSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  config: ArenaConfig;
  status: ArenaStatus;
  balance: number;            // cash on hand
  startingBalance: number;
  holdings: ArenaHolding[];
  trades: ArenaTrade[];
  memory: ArenaMemory;
  cycleCount: number;
  totalValue: number;         // cash + holdings mark-to-market
  peakValue: number;
  deathReason?: string;
}

export interface ArenaLogEntry {
  id: string;
  timestamp: number;
  type: "info" | "trade" | "learn" | "warn" | "death";
  message: string;
  trade?: ArenaTrade;
}

// ─── Default config ───────────────────────────────────────────────────────────

export const ARENA_DEFAULT_CONFIG: ArenaConfig = {
  startingBalance: 10000,
  riskLevel: "moderate",
  watchedAssets: ["bitcoin", "ethereum", "RELIANCE", "INFY", "TCS"],
  intervalMinutes: 2,
  groqApiKey: API_KEYS.GROQ || "YOUR_GROQ_API_KEY",
  newsApiKey: "YOUR_GNEWS_API_KEY",
  minConfidenceThreshold: 60,
};

// ─── Storage keys (all isolated from main agent) ──────────────────────────────

const SK = {
  session: "arenaSession",
  log:     "arenaLog",
  status:  "arenaStatus",
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function loadArenaSession(): ArenaSession | null {
  try {
    const raw = localStorage.getItem(SK.session);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveArenaSession(session: ArenaSession): void {
  localStorage.setItem(SK.session, JSON.stringify(session));
}

export function loadArenaLog(): ArenaLogEntry[] {
  try {
    const raw = localStorage.getItem(SK.log);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function appendArenaLog(entry: Omit<ArenaLogEntry, "id">): ArenaLogEntry {
  const full: ArenaLogEntry = { id: `al-${Date.now()}-${Math.random()}`, ...entry };
  const log = loadArenaLog();
  const trimmed = [full, ...log].slice(0, 300);
  localStorage.setItem(SK.log, JSON.stringify(trimmed));
  return full;
}

export function clearArenaData(): void {
  localStorage.removeItem(SK.session);
  localStorage.removeItem(SK.log);
  localStorage.removeItem(SK.status);
}

// ─── Session factory ──────────────────────────────────────────────────────────

export function createArenaSession(config: ArenaConfig): ArenaSession {
  return {
    id: `arena-${Date.now()}`,
    startedAt: Date.now(),
    config,
    status: "running",
    balance: config.startingBalance,
    startingBalance: config.startingBalance,
    holdings: [],
    trades: [],
    memory: { lessons: [], recentOutcomes: [], winRate: 50, avgPnlPct: 0 },
    cycleCount: 0,
    totalValue: config.startingBalance,
    peakValue: config.startingBalance,
  };
}

// ─── Memory updater — called after a trade is closed ─────────────────────────

function updateMemory(memory: ArenaMemory, trade: ArenaTrade): ArenaMemory {
  const outcome = trade.outcome ?? "neutral";
  const recentOutcomes = [...memory.recentOutcomes, outcome].slice(-20); // keep last 20

  const wins = recentOutcomes.filter((o) => o === "profit").length;
  const winRate = Math.round((wins / recentOutcomes.length) * 100);

  const closedPnls = [...memory.recentOutcomes, outcome]
    .map((_, i) => i)                   // placeholder — actual pnl tracked via lessons
    .filter(Boolean);

  // Build a lesson string the LLM can read in the next cycle
  let lesson = "";
  if (trade.realisedPnl !== undefined && trade.realisedPnlPct !== undefined) {
    const sign = trade.realisedPnl >= 0 ? "+" : "";
    lesson =
      `[Lesson from ${trade.action.toUpperCase()} ${trade.assetName} @ ₹${trade.price.toLocaleString("en-IN")}: ` +
      `realised ${sign}${trade.realisedPnlPct.toFixed(1)}% (${sign}₹${trade.realisedPnl.toFixed(0)}). ` +
      `Confidence was ${trade.confidence}%. ` +
      (trade.realisedPnl >= 0
        ? `Strategy worked — ${trade.reasoning.split(".")[0]}.`
        : `Strategy failed — ${trade.reasoning.split(".")[0]}. Avoid similar signals next time.`) +
      `]`;
  }

  const lessons = lesson
    ? [...memory.lessons, lesson].slice(-10) // keep last 10 lessons
    : memory.lessons;

  // Recalculate avgPnlPct from recent outcomes (simplified)
  const avgPnlPct = winRate > 50
    ? memory.avgPnlPct * 0.8 + (trade.realisedPnlPct ?? 0) * 0.2
    : memory.avgPnlPct * 0.8 + (trade.realisedPnlPct ?? 0) * 0.2;

  return { lessons, recentOutcomes, winRate, avgPnlPct };
}

// ─── Groq analysis — arena version (injects memory into prompt) ───────────────

interface ArenaSentiment {
  action: TradeAction;
  confidence: number;
  reasoning: string;
}

async function analyzeWithMemory(
  assetName: string,
  assetType: "stock" | "crypto",
  currentPrice: number,
  newsSummary: string,
  config: ArenaConfig,
  memory: ArenaMemory,
  balance: number,
  startingBalance: number
): Promise<ArenaSentiment> {
  const apiKey =
    process.env.NEXT_PUBLIC_GROQ_API_KEY ||
    config.groqApiKey ||
    API_KEYS.GROQ;

  if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") {
    return { action: "hold", confidence: 0, reasoning: "No Groq API key configured." };
  }

  const riskContext = {
    conservative: "Only BUY on strong positive signals (confidence ≥ 80). Heavily prefer HOLD.",
    moderate:     "BUY on clear positive signals (confidence ≥ 60). SELL on clear negative signals.",
    aggressive:   "BUY on mildly positive signals. Actively take both sides.",
  }[config.riskLevel];

  const pnlContext = balance < startingBalance
    ? `SURVIVAL ALERT: Current balance ₹${balance.toLocaleString("en-IN")} is BELOW starting balance ₹${startingBalance.toLocaleString("en-IN")}. Be more conservative — capital preservation is critical.`
    : `Current balance ₹${balance.toLocaleString("en-IN")} vs starting ₹${startingBalance.toLocaleString("en-IN")} — trading normally.`;

  const memoryContext = memory.lessons.length > 0
    ? `\n\nYOUR PAST TRADING LESSONS (learn from these):\n${memory.lessons.slice(-5).join("\n")}\n\nYour recent win rate: ${memory.winRate}%. Let this inform your confidence.`
    : "";

  const systemPrompt =
    "You are an AI trading agent competing in a survival arena. You were given a fixed amount of money and must grow it through smart trades. " +
    "If your balance hits zero, you die. You MUST learn from past trades and avoid repeating mistakes. " +
    "RULES: (1) Only BUY when you have a specific, concrete reason — news catalyst, technical signal, or strong fundamental. " +
    "(2) SELL when you have clear evidence the trade is going wrong or profit target is near. " +
    "(3) HOLD when there is no clear signal — do not trade for the sake of trading. " +
    "(4) You remember your past wins and losses — use them to improve decisions. " +
    "Always respond with ONLY a valid JSON object.";

  const userPrompt =
    `Asset: ${assetName} (${assetType})\n` +
    `Current Price: ₹${currentPrice.toLocaleString("en-IN")}\n` +
    `Risk Profile: ${config.riskLevel} — ${riskContext}\n` +
    `${pnlContext}` +
    memoryContext + `\n\n` +
    `Market Context & News:\n${newsSummary}\n\n` +
    `Decide: BUY, SELL, or HOLD.\n\n` +
    `Respond with exactly this JSON:\n` +
    `{"action":"buy"|"sell"|"hold","confidence":<0-100>,"reasoning":"<2-3 sentences: cite the specific catalyst or lesson that drove this decision>"}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq ${response.status}: ${errText}`);
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
    return { action: "hold", confidence: 0, reasoning: `API error: ${msg}` };
  }
}

// ─── Generate lesson after a sell ────────────────────────────────────────────

async function generateLesson(
  trade: ArenaTrade,
  realisedPnl: number,
  realisedPnlPct: number,
  apiKey: string
): Promise<string> {
  if (!apiKey || apiKey === "YOUR_GROQ_API_KEY") {
    return realisedPnl >= 0
      ? `Profitable ${trade.action} on ${trade.assetName} (+${realisedPnlPct.toFixed(1)}%). Reasoning held up.`
      : `Loss on ${trade.action} of ${trade.assetName} (${realisedPnlPct.toFixed(1)}%). Reconsider this signal type.`;
  }

  try {
    const prompt =
      `You made a ${trade.action.toUpperCase()} trade on ${trade.assetName}.\n` +
      `Your reasoning was: "${trade.reasoning}"\n` +
      `Result: ${realisedPnl >= 0 ? "PROFIT" : "LOSS"} of ${realisedPnlPct.toFixed(1)}% (₹${realisedPnl.toFixed(0)})\n\n` +
      `In 1-2 sentences, what should you remember for next time? Be specific and actionable.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 120,
      }),
    });

    if (!response.ok) throw new Error("lesson API failed");
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return realisedPnl >= 0
      ? `${trade.assetName} trade was profitable (+${realisedPnlPct.toFixed(1)}%). This signal type worked.`
      : `${trade.assetName} trade resulted in a loss (${realisedPnlPct.toFixed(1)}%). Avoid similar conditions.`;
  }
}

// ─── Buy / Sell within the arena (isolated, does NOT touch main portfolio) ────

function arenaBuy(
  session: ArenaSession,
  assetId: string,
  assetName: string,
  assetType: "stock" | "crypto",
  price: number,
  sentiment: ArenaSentiment,
  newsHeadlines: string[]
): ArenaTrade | null {
  const maxSpend = Math.min(
    session.balance * 0.25,                          // never more than 25% of balance per trade
    session.config.startingBalance * 0.25            // cap at 25% of original budget
  );

  if (maxSpend < 10 || price <= 0) return null;

  const quantity = parseFloat((maxSpend / price).toFixed(assetType === "crypto" ? 6 : 2));
  const totalValue = parseFloat((quantity * price).toFixed(2));
  if (quantity <= 0 || totalValue > session.balance) return null;

  // Deduct from arena cash
  session.balance = parseFloat((session.balance - totalValue).toFixed(2));

  // Update or add holding
  const idx = session.holdings.findIndex((h) => h.assetId === assetId);
  if (idx !== -1) {
    const h = session.holdings[idx];
    const newQty = h.quantity + quantity;
    const newAvg = (h.avgBuyPrice * h.quantity + price * quantity) / newQty;
    session.holdings[idx] = { ...h, quantity: newQty, avgBuyPrice: newAvg, currentPrice: price };
  } else {
    session.holdings.push({
      assetId, assetName, assetType, quantity,
      avgBuyPrice: price, currentPrice: price,
      unrealisedPnl: 0, unrealisedPnlPct: 0,
    });
  }

  const trade: ArenaTrade = {
    id: `at-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    assetId, assetName, assetType,
    action: "buy",
    price, quantity, totalValue,
    confidence: sentiment.confidence,
    reasoning: sentiment.reasoning,
    newsHeadlines,
  };

  session.trades.push(trade);
  return trade;
}

function arenaSell(
  session: ArenaSession,
  assetId: string,
  price: number,
  sentiment: ArenaSentiment,
  newsHeadlines: string[],
  fraction: number = 0.5
): ArenaTrade | null {
  const idx = session.holdings.findIndex((h) => h.assetId === assetId);
  if (idx === -1) return null;

  const holding = session.holdings[idx];
  const sellQty = parseFloat((holding.quantity * fraction).toFixed(holding.assetType === "crypto" ? 6 : 2));
  if (sellQty <= 0) return null;

  const totalValue = parseFloat((sellQty * price).toFixed(2));
  const realisedPnl = parseFloat(((price - holding.avgBuyPrice) * sellQty).toFixed(2));
  const realisedPnlPct = parseFloat((((price / holding.avgBuyPrice) - 1) * 100).toFixed(2));

  // Return cash to arena balance
  session.balance = parseFloat((session.balance + totalValue).toFixed(2));

  // Update holding
  const remaining = holding.quantity - sellQty;
  if (remaining <= 0.000001) {
    session.holdings.splice(idx, 1);
  } else {
    session.holdings[idx] = { ...holding, quantity: remaining };
  }

  const trade: ArenaTrade = {
    id: `at-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    assetId,
    assetName: holding.assetName,
    assetType: holding.assetType,
    action: "sell",
    price, quantity: sellQty, totalValue,
    confidence: sentiment.confidence,
    reasoning: sentiment.reasoning,
    newsHeadlines,
    outcome: realisedPnl >= 0 ? "profit" : "loss",
    realisedPnl,
    realisedPnlPct,
  };

  session.trades.push(trade);
  return trade;
}

// ─── Mark holdings to market ──────────────────────────────────────────────────

function markToMarket(
  session: ArenaSession,
  marketDataMap: Map<string, { price: number; name: string; type: "stock" | "crypto" }>
): void {
  let holdingsValue = 0;
  for (const h of session.holdings) {
    const market = marketDataMap.get(h.assetId);
    if (market) {
      h.currentPrice = market.price;
      h.unrealisedPnl = parseFloat(((market.price - h.avgBuyPrice) * h.quantity).toFixed(2));
      h.unrealisedPnlPct = parseFloat((((market.price / h.avgBuyPrice) - 1) * 100).toFixed(2));
    }
    holdingsValue += h.currentPrice * h.quantity;
  }
  session.totalValue = parseFloat((session.balance + holdingsValue).toFixed(2));
  if (session.totalValue > session.peakValue) {
    session.peakValue = session.totalValue;
  }
}

// ─── Death check ──────────────────────────────────────────────────────────────

function checkDeath(session: ArenaSession): string | null {
  const holdingsValue = session.holdings.reduce(
    (sum, h) => sum + h.currentPrice * h.quantity, 0
  );
  const totalValue = session.balance + holdingsValue;

  // Die if total value (cash + holdings) drops below 2% of starting balance
  if (totalValue < session.startingBalance * 0.02) {
    return `Total portfolio value (₹${totalValue.toFixed(0)}) collapsed to near zero — the agent has been eliminated.`;
  }

  // Die if cash is below ₹1 AND no holdings left
  if (session.balance < 1 && session.holdings.length === 0) {
    return `Ran out of cash with no holdings remaining — the agent is dead.`;
  }

  return null;
}

// ─── Main arena cycle ─────────────────────────────────────────────────────────

export async function runArenaCycle(
  session: ArenaSession,
  onLog: (entry: ArenaLogEntry) => void,
  onSessionUpdate: (session: ArenaSession) => void
): Promise<void> {
  const log = (type: ArenaLogEntry["type"], message: string, trade?: ArenaTrade) => {
    const entry = appendArenaLog({ timestamp: Date.now(), type, message, trade });
    onLog(entry);
  };

  session.cycleCount++;
  log("info", `🏟️ Arena cycle ${session.cycleCount} — Cash: ₹${session.balance.toLocaleString("en-IN")} | Total: ₹${session.totalValue.toLocaleString("en-IN")}`);

  // 1. Fetch market data
  const [cryptoMarket, stockMarket] = await Promise.all([
    fetchRealTimeCryptoData().catch(() => []),
    fetchRealTimeStockData().catch(() => []),
  ]);

  const marketDataMap = new Map<string, { price: number; name: string; type: "stock" | "crypto" }>();
  for (const s of stockMarket) {
    const id = typeof s.id === "string" ? s.id.split(".")[0] : String(s.id);
    marketDataMap.set(id, { price: s.price, name: s.name, type: "stock" });
    if (s.ticker) marketDataMap.set(s.ticker, { price: s.price, name: s.name, type: "stock" });
  }
  for (const c of cryptoMarket) {
    marketDataMap.set(c.id, { price: c.price, name: c.name, type: "crypto" });
  }

  // 2. Mark existing holdings to market
  markToMarket(session, marketDataMap);
  onSessionUpdate({ ...session });

  // 3. Check death condition
  const deathReason = checkDeath(session);
  if (deathReason) {
    session.status = "dead";
    session.endedAt = Date.now();
    session.deathReason = deathReason;
    log("death", `💀 ${deathReason}`);
    saveArenaSession(session);
    onSessionUpdate({ ...session });
    return;
  }

  // 4. Fetch news
  const news: NewsArticle[] = await fetchFinancialNews(session.config.newsApiKey, 15);

  // 5. Analyse each watched asset
  for (const assetId of session.config.watchedAssets) {
    const market = marketDataMap.get(assetId);
    if (!market || !market.price) continue;

    const newsSummary = buildNewsSummaryForAsset(news, assetId);
    const hasNews = !newsSummary.includes("No recent news");
    const contextForLLM = hasNews
      ? newsSummary
      : `No recent news for ${market.name}. No specific catalyst identified — consider HOLD.`;

    const sentiment = await analyzeWithMemory(
      market.name,
      market.type,
      market.price,
      contextForLLM,
      session.config,
      session.memory,
      session.balance,
      session.startingBalance
    );

    // Confidence gate
    if (sentiment.confidence < session.config.minConfidenceThreshold && sentiment.action !== "hold") {
      log("info", `⏸ ${market.name}: ${sentiment.action.toUpperCase()} signal below confidence threshold (${sentiment.confidence}% < ${session.config.minConfidenceThreshold}%) — holding`);
      continue;
    }

    const relatedHeadlines = news
      .filter((n) => n.relatedAssets?.includes(assetId))
      .map((n) => n.title);

    if (sentiment.action === "buy") {
      if (session.balance < 10) {
        log("warn", `💸 Want to BUY ${market.name} but insufficient cash (₹${session.balance.toFixed(0)}) — skipping`);
        continue;
      }

      const trade = arenaBuy(session, assetId, market.name, market.type, market.price, sentiment, relatedHeadlines);
      if (trade) {
        log(
          "trade",
          `🟢 ARENA BUY ${trade.quantity} ${market.name} @ ₹${market.price.toLocaleString("en-IN")} = ₹${trade.totalValue.toLocaleString("en-IN")} (${sentiment.confidence}% confidence)`,
          trade
        );
      }
    } else if (sentiment.action === "sell") {
      const holding = session.holdings.find((h) => h.assetId === assetId);
      if (!holding) {
        log("info", `ℹ️ SELL signal for ${market.name} but no arena holdings — skipping`);
        continue;
      }

      const sellFraction = session.config.riskLevel === "aggressive" ? 1.0 : 0.5;
      const trade = arenaSell(session, assetId, market.price, sentiment, relatedHeadlines, sellFraction);

      if (trade) {
        // Generate a lesson from this closed trade
        const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || session.config.groqApiKey || API_KEYS.GROQ;
        const lesson = await generateLesson(trade, trade.realisedPnl!, trade.realisedPnlPct!, apiKey);
        trade.lesson = lesson;

        // Update memory with this outcome
        session.memory = updateMemory(session.memory, trade);

        const pnlSign = (trade.realisedPnl ?? 0) >= 0 ? "+" : "";
        log(
          "trade",
          `🔴 ARENA SELL ${trade.quantity} ${market.name} @ ₹${market.price.toLocaleString("en-IN")} | P&L: ${pnlSign}₹${trade.realisedPnl?.toFixed(0)} (${pnlSign}${trade.realisedPnlPct?.toFixed(1)}%)`,
          trade
        );
        log("learn", `🧠 Lesson learned: ${lesson}`);
      }
    } else {
      log("info", `⏸ HOLD ${market.name} — ${sentiment.reasoning}`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  // 6. Final death check after trades
  markToMarket(session, marketDataMap);
  const postTradeDeathReason = checkDeath(session);
  if (postTradeDeathReason) {
    session.status = "dead";
    session.endedAt = Date.now();
    session.deathReason = postTradeDeathReason;
    log("death", `💀 ${postTradeDeathReason}`);
  } else {
    log("info", `✅ Cycle ${session.cycleCount} complete — Total Value: ₹${session.totalValue.toLocaleString("en-IN")} | PnL: ${session.totalValue >= session.startingBalance ? "+" : ""}${(((session.totalValue / session.startingBalance) - 1) * 100).toFixed(1)}%`);
  }

  saveArenaSession(session);
  onSessionUpdate({ ...session });
}

// ─── Interval runner ──────────────────────────────────────────────────────────

let _arenaHandle: ReturnType<typeof setInterval> | null = null;

export function startArenaSession(
  session: ArenaSession,
  onLog: (entry: ArenaLogEntry) => void,
  onSessionUpdate: (s: ArenaSession) => void
): void {
  if (_arenaHandle !== null) return;

  saveArenaSession(session);

  const run = async () => {
    const current = loadArenaSession();
    if (!current || current.status !== "running") {
      stopArenaSession();
      return;
    }
    try {
      await runArenaCycle(current, onLog, onSessionUpdate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendArenaLog({ timestamp: Date.now(), type: "warn", message: `⚠️ Cycle error: ${msg}` });
    }
  };

  run();
  _arenaHandle = setInterval(run, session.config.intervalMinutes * 60 * 1000);
}

export function stopArenaSession(): void {
  if (_arenaHandle !== null) {
    clearInterval(_arenaHandle);
    _arenaHandle = null;
  }
}

export function isArenaRunning(): boolean {
  return _arenaHandle !== null;
}
