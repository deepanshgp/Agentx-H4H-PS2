// Multi-Agent Debate System
// 4 specialized agents argue for/against a trade, then a Moderator delivers the final verdict.
//
// Primary LLM: NVIDIA Nemotron-3.5-Lightning-30B-A3B (via integrate.api.nvidia.com)
// Fallback LLM: Groq LLaMA-3.3-70B
//
// Agents:
//   Bull Analyst     — finds every reason to BUY; optimistic, momentum-focused
//   Bear Analyst     — finds every reason to SELL or HOLD; pessimistic, risk-focused
//   Risk Manager     — purely evaluates downside, position sizing, and capital preservation
//   Quant Strategist — data-driven; looks at technical indicators and statistical edge
//   Moderator        — reads all 4 arguments and makes the final binding decision

import { callLLM } from "./llm-client";
import { TradeAction, RiskLevel } from "./trading-agent";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DebateAgentRole = "bull" | "bear" | "risk" | "quant" | "moderator";

export interface DebateAgentMeta {
  role: DebateAgentRole;
  name: string;
  emoji: string;
  color: string;
  textColor: string;
  borderColor: string;
  description: string;
}

export const DEBATE_AGENTS: Record<DebateAgentRole, DebateAgentMeta> = {
  bull: {
    role: "bull",
    name: "Bull Analyst",
    emoji: "🐂",
    color: "bg-green-50",
    textColor: "text-green-800",
    borderColor: "border-green-300",
    description: "Seeks upside catalysts and momentum signals to justify buying.",
  },
  bear: {
    role: "bear",
    name: "Bear Analyst",
    emoji: "🐻",
    color: "bg-red-50",
    textColor: "text-red-800",
    borderColor: "border-red-300",
    description: "Challenges every bullish assumption and highlights downside risks.",
  },
  risk: {
    role: "risk",
    name: "Risk Manager",
    emoji: "🛡️",
    color: "bg-orange-50",
    textColor: "text-orange-800",
    borderColor: "border-orange-300",
    description: "Focuses solely on capital preservation, drawdown, and position sizing.",
  },
  quant: {
    role: "quant",
    name: "Quant Strategist",
    emoji: "📊",
    color: "bg-blue-50",
    textColor: "text-blue-800",
    borderColor: "border-blue-300",
    description: "Evaluates statistical edge, technical indicators, and historical patterns.",
  },
  moderator: {
    role: "moderator",
    name: "Moderator",
    emoji: "⚖️",
    color: "bg-purple-50",
    textColor: "text-purple-800",
    borderColor: "border-purple-300",
    description: "Weighs all arguments and delivers the final binding trade decision.",
  },
};

export interface AgentArgument {
  role: DebateAgentRole;
  vote: TradeAction;
  confidence: number;
  argument: string;
  keyPoints: string[];
  timestamp: number;
  /** Which LLM provider actually answered */
  llmProvider?: string;
}

export interface DebateVerdict {
  finalAction: TradeAction;
  finalConfidence: number;
  reasoning: string;
  voteBreakdown: Record<TradeAction, number>;
  consensusLevel: "unanimous" | "majority" | "split" | "contested";
  shouldExecute: boolean;
  llmProvider?: string;
}

export interface DebateSession {
  id: string;
  assetId: string;
  assetName: string;
  assetType: "stock" | "crypto";
  currentPrice: number;
  newsSummary: string;
  riskLevel: RiskLevel;
  arguments: AgentArgument[];
  verdict: DebateVerdict | null;
  startedAt: number;
  completedAt: number | null;
  status: "pending" | "debating" | "complete" | "error";
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const DEBATE_KEY = "agentDebateHistory";

export function loadDebateHistory(): DebateSession[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(DEBATE_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDebateSession(session: DebateSession): void {
  const history = loadDebateHistory();
  const idx = history.findIndex((s) => s.id === session.id);
  if (idx !== -1) {
    history[idx] = session;
  } else {
    history.unshift(session);
  }
  localStorage.setItem(DEBATE_KEY, JSON.stringify(history.slice(0, 20)));
}

export function clearDebateHistory(): void {
  localStorage.setItem(DEBATE_KEY, JSON.stringify([]));
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildAgentSystemPrompt(role: DebateAgentRole): string {
  const personas: Record<DebateAgentRole, string> = {
    bull: `You are the BULL ANALYST in a trading committee powered by NVIDIA Nemotron. Your job is to identify EVERY bullish signal, positive catalyst, and upside opportunity for the asset. You lean toward recommending BUY whenever there is any reasonable justification. You are optimistic, momentum-focused, and highlight growth potential. Even if news is mixed, find the silver lining. Never refuse to give a BUY argument — make the strongest possible case for buying.`,

    bear: `You are the BEAR ANALYST in a trading committee powered by NVIDIA Nemotron. Your job is to challenge bullish assumptions and highlight EVERY bearish signal, risk factor, and downside scenario. You lean toward recommending HOLD or SELL. You are skeptical of hype, sensitive to overvaluation, and always ask "what could go wrong?". Even if news seems positive, find the counter-arguments. Make the strongest possible case for caution or selling.`,

    risk: `You are the RISK MANAGER in a trading committee powered by NVIDIA Nemotron. You are NOT here to predict price direction — you are here to protect capital. Focus exclusively on: (1) maximum potential downside if wrong, (2) whether the position size is appropriate, (3) correlation with existing portfolio risk, (4) liquidity and exit risks. If risk/reward is unfavorable, recommend HOLD regardless of price direction. Your only agenda is capital preservation.`,

    quant: `You are the QUANT STRATEGIST in a trading committee powered by NVIDIA Nemotron. You speak only in data, statistics, and technical signals. Focus on: (1) recent price momentum and trend direction, (2) volatility relative to historical norms, (3) whether current price is statistically extended or at fair value, (4) historical win-rate of similar setups. Avoid opinion — only cite what the numbers suggest. Be precise and analytical.`,

    moderator: `You are the MODERATOR of a trading committee powered by NVIDIA Nemotron. You have received arguments from 4 specialists: a Bull Analyst, Bear Analyst, Risk Manager, and Quant Strategist. Your job is to weigh all arguments objectively, identify where there is consensus vs conflict, and deliver a FINAL binding decision. You must not simply average opinions — think critically about which arguments are strongest given the specific situation. Output the final verdict.`,
  };
  return (
    personas[role] +
    "\n\nALWAYS respond with ONLY a valid JSON object. No markdown, no code fences, no extra text."
  );
}

function buildAgentUserPrompt(
  role: DebateAgentRole,
  assetName: string,
  assetType: "stock" | "crypto",
  currentPrice: number,
  newsSummary: string,
  riskLevel: RiskLevel
): string {
  return (
    `Asset: ${assetName} (${assetType})\n` +
    `Current Price: ₹${currentPrice.toLocaleString("en-IN")}\n` +
    `Portfolio Risk Level: ${riskLevel}\n\n` +
    `Market Context & News:\n${newsSummary}\n\n` +
    `Respond with this exact JSON:\n` +
    `{"vote":"buy"|"sell"|"hold","confidence":<0-100>,"argument":"<2-3 sentence argument from your perspective>","keyPoints":["<point 1>","<point 2>","<point 3>"]}`
  );
}

function buildModeratorUserPrompt(
  assetName: string,
  assetType: "stock" | "crypto",
  currentPrice: number,
  riskLevel: RiskLevel,
  args: AgentArgument[]
): string {
  const summary = args
    .map(
      (a) =>
        `${DEBATE_AGENTS[a.role].name} voted ${a.vote.toUpperCase()} (${a.confidence}% confidence):\n"${a.argument}"\nKey points: ${a.keyPoints.map((p) => `- ${p}`).join("; ")}`
    )
    .join("\n\n");

  return (
    `Asset: ${assetName} (${assetType}) @ ₹${currentPrice.toLocaleString("en-IN")}\n` +
    `Portfolio Risk Level: ${riskLevel}\n\n` +
    `=== DEBATE TRANSCRIPT ===\n${summary}\n\n` +
    `=== YOUR TASK ===\n` +
    `Review all arguments. Determine the final action.\n\n` +
    `Respond with this exact JSON:\n` +
    `{"finalAction":"buy"|"sell"|"hold","finalConfidence":<0-100>,"reasoning":"<3-4 sentence synthesis explaining why this side won the debate and what factors were most decisive>"}`
  );
}

// ─── Single agent ─────────────────────────────────────────────────────────────

async function runSingleAgent(
  role: DebateAgentRole,
  assetId: string,
  assetName: string,
  assetType: "stock" | "crypto",
  currentPrice: number,
  newsSummary: string,
  riskLevel: RiskLevel
): Promise<AgentArgument> {
  const temperatureMap: Partial<Record<DebateAgentRole, number>> = {
    bull: 0.7, bear: 0.6, risk: 0.3, quant: 0.3, moderator: 0.2,
  };

  try {
    const { text, provider, model } = await callLLM({
      systemPrompt: buildAgentSystemPrompt(role),
      userPrompt: buildAgentUserPrompt(role, assetName, assetType, currentPrice, newsSummary, riskLevel),
      temperature: temperatureMap[role] ?? 0.4,
      maxTokens: 600,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    const parsed = JSON.parse(match[0]);

    return {
      role,
      vote: (["buy", "sell", "hold"].includes(parsed.vote) ? parsed.vote : "hold") as TradeAction,
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
      argument: parsed.argument || "No argument provided.",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
      timestamp: Date.now(),
      llmProvider: `${provider === "nvidia" ? "NVIDIA Nemotron" : "Groq LLaMA"} · ${model}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      role,
      vote: "hold",
      confidence: 0,
      argument: `Agent unavailable: ${msg}`,
      keyPoints: ["Could not reach LLM API"],
      timestamp: Date.now(),
      llmProvider: "unavailable",
    };
  }
}

// ─── Moderator ────────────────────────────────────────────────────────────────

async function runModerator(
  assetName: string,
  assetType: "stock" | "crypto",
  currentPrice: number,
  riskLevel: RiskLevel,
  args: AgentArgument[]
): Promise<{ verdict: DebateVerdict; argument: AgentArgument }> {
  const tally: Record<TradeAction, number> = { buy: 0, sell: 0, hold: 0 };
  for (const a of args) tally[a.vote]++;

  let finalAction: TradeAction = "hold";
  let finalConfidence = 50;
  let reasoning = "Moderator could not reach LLM API — defaulting to HOLD.";
  let providerLabel = "unavailable";

  try {
    const { text, provider, model } = await callLLM({
      systemPrompt: buildAgentSystemPrompt("moderator"),
      userPrompt: buildModeratorUserPrompt(assetName, assetType, currentPrice, riskLevel, args),
      temperature: 0.2,
      maxTokens: 700,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    const parsed = JSON.parse(match[0]);
    finalAction = (["buy", "sell", "hold"].includes(parsed.finalAction) ? parsed.finalAction : "hold") as TradeAction;
    finalConfidence = Math.min(100, Math.max(0, Number(parsed.finalConfidence) || 50));
    reasoning = parsed.reasoning || reasoning;
    providerLabel = `${provider === "nvidia" ? "NVIDIA Nemotron" : "Groq LLaMA"} · ${model}`;
  } catch {
    // keep defaults
  }

  const maxVotes = Math.max(...Object.values(tally));
  const consensusLevel: DebateVerdict["consensusLevel"] =
    maxVotes === 4 ? "unanimous"
    : maxVotes === 3 ? "majority"
    : maxVotes === 2 ? "split"
    : "contested";

  const verdict: DebateVerdict = {
    finalAction,
    finalConfidence,
    reasoning,
    voteBreakdown: tally,
    consensusLevel,
    shouldExecute: finalConfidence >= 65 && consensusLevel !== "contested",
    llmProvider: providerLabel,
  };

  const modArg: AgentArgument = {
    role: "moderator",
    vote: finalAction,
    confidence: finalConfidence,
    argument: reasoning,
    keyPoints: [
      `Vote tally: ${tally.buy} BUY · ${tally.sell} SELL · ${tally.hold} HOLD`,
      `Consensus: ${consensusLevel}`,
      `Will execute: ${verdict.shouldExecute ? "Yes" : "No — confidence or consensus too low"}`,
    ],
    timestamp: Date.now(),
    llmProvider: providerLabel,
  };

  return { verdict, argument: modArg };
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export type DebateProgressCallback = (
  session: DebateSession,
  latestArg?: AgentArgument
) => void;

/**
 * Runs the full 5-agent debate for one asset.
 * Panel agents (Bull, Bear, Risk, Quant) run in parallel via NVIDIA Nemotron.
 * Moderator reads all 4 transcripts and delivers the binding verdict.
 * onProgress fires after each agent so the UI can stream results live.
 *
 * NOTE: apiKey parameter is kept for backward compatibility but the unified
 * llm-client now picks up NVIDIA and Groq keys from API_KEYS automatically.
 */
export async function runDebate(
  assetId: string,
  assetName: string,
  assetType: "stock" | "crypto",
  currentPrice: number,
  newsSummary: string,
  riskLevel: RiskLevel,
  _apiKey: string,          // kept for API compat — llm-client handles key selection
  onProgress?: DebateProgressCallback
): Promise<DebateSession> {
  const session: DebateSession = {
    id: `debate-${Date.now()}-${assetId}`,
    assetId,
    assetName,
    assetType,
    currentPrice,
    newsSummary,
    riskLevel,
    arguments: [],
    verdict: null,
    startedAt: Date.now(),
    completedAt: null,
    status: "debating",
  };

  onProgress?.(session);

  // Run Bull, Bear, Risk, Quant in parallel — NVIDIA NIM handles all 4 simultaneously
  const panelRoles: DebateAgentRole[] = ["bull", "bear", "risk", "quant"];

  const panelResults = await Promise.allSettled(
    panelRoles.map((role) =>
      runSingleAgent(role, assetId, assetName, assetType, currentPrice, newsSummary, riskLevel)
    )
  );

  for (const result of panelResults) {
    if (result.status === "fulfilled") {
      session.arguments.push(result.value);
      onProgress?.({ ...session }, result.value);
    }
  }

  // Moderator synthesises all 4 arguments
  const { verdict, argument: modArg } = await runModerator(
    assetName,
    assetType,
    currentPrice,
    riskLevel,
    session.arguments
  );

  session.arguments.push(modArg);
  session.verdict = verdict;
  session.completedAt = Date.now();
  session.status = "complete";

  onProgress?.({ ...session }, modArg);
  saveDebateSession(session);

  return session;
}
