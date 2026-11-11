// Browser persistence (localStorage) for the RL agent: model weights, settings,
// training history, trade-outcome memory and the learning-event log.

import type { AgentSnapshot, UpdateStats } from "./ppo";
import type { RewardBreakdown } from "./rewards";

const KEYS = {
  agent: "rl.agent.v1",
  meta: "rl.meta.v1",
  memory: "rl.tradeMemory.v1",
  events: "rl.events.v1",
  live: "rl.live.v1",
  settings: "rl.settings.v1",
};

const hasLS = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!hasLS()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  if (!hasLS()) return false;
  try {
    // Round floats to keep the stored model compact (weights don't need 17 digits)
    localStorage.setItem(
      key,
      JSON.stringify(value, (_k, v) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 1e7) / 1e7 : v))
    );
    return true;
  } catch {
    return false; // quota exceeded etc.
  }
}

// ─── Agent model ─────────────────────────────────────────────────────────────

export interface AgentMeta {
  trainedAt: number;
  trainedOn: string[];
  iterations: number;
  totalSteps: number;
  onlineUpdates: number;
  validation?: { totalReturn: number; buyHoldReturn: number; sharpe: number; maxDrawdown: number; nTrades: number; asset: string };
}

export const loadAgentSnapshot = () => read<AgentSnapshot | null>(KEYS.agent, null);
export const saveAgentSnapshot = (s: AgentSnapshot) => write(KEYS.agent, s);
export const loadAgentMeta = () => read<AgentMeta | null>(KEYS.meta, null);
export const saveAgentMeta = (m: AgentMeta) => write(KEYS.meta, m);

// ─── Settings ────────────────────────────────────────────────────────────────

export interface RLSettings {
  assetId: string;
  iterations: number;
  useSynthetic: boolean;
  trainOnAllAssets: boolean;
  tradePenalty: number;
  drawdownPenalty: number;
  liveAssets: string[];
  liveIntervalMinutes: number;
  liveExplore: boolean;
  liveLearn: boolean;
}

export const DEFAULT_SETTINGS: RLSettings = {
  assetId: "bitcoin",
  iterations: 40,
  useSynthetic: true,
  trainOnAllAssets: false,
  tradePenalty: 0.02,
  drawdownPenalty: 0.5,
  liveAssets: ["bitcoin", "ethereum", "RELIANCE"],
  liveIntervalMinutes: 5,
  liveExplore: true,
  liveLearn: true,
};

export const loadSettings = (): RLSettings => ({ ...DEFAULT_SETTINGS, ...read<Partial<RLSettings>>(KEYS.settings, {}) });
export const saveSettings = (s: RLSettings) => write(KEYS.settings, s);

// ─── Trade-outcome memory ────────────────────────────────────────────────────

export interface TradeMemoryEntry {
  id: string;
  ts: number;
  source: "live" | "backtest";
  assetId: string;
  assetName: string;
  side: "BUY" | "SELL";
  price: number;
  value: number;
  /** Realised result (fraction) for SELLs; null for BUYs. */
  realizedPct: number | null;
}

export const loadTradeMemory = () => read<TradeMemoryEntry[]>(KEYS.memory, []);
export function appendTradeMemory(entries: TradeMemoryEntry[]) {
  if (!entries.length) return;
  write(KEYS.memory, [...entries, ...loadTradeMemory()].slice(0, 400));
}
export const clearTradeMemory = () => write(KEYS.memory, []);

// ─── Learning events (rewards / penalties / PPO updates) ─────────────────────

export interface LearningEvent {
  id: string;
  ts: number;
  kind: "reward" | "update" | "info" | "warn";
  message: string;
  assetId?: string;
  reward?: number;
  breakdown?: RewardBreakdown;
  stats?: UpdateStats;
}

export const loadEvents = () => read<LearningEvent[]>(KEYS.events, []);
export function appendEvents(events: Omit<LearningEvent, "id">[]): LearningEvent[] {
  const full = events.map((e, i) => ({ ...e, id: `ev-${e.ts}-${i}-${Math.random().toString(36).slice(2, 7)}` }));
  const merged = [...full.reverse(), ...loadEvents()].slice(0, 300);
  write(KEYS.events, merged);
  return merged;
}
export const clearEvents = () => write(KEYS.events, []);

// ─── Live (paper-trading) state ──────────────────────────────────────────────

export const loadLiveRaw = <T,>() => read<T | null>(KEYS.live, null);
export const saveLiveRaw = (s: unknown) => write(KEYS.live, s);
export const clearLive = () => {
  if (hasLS()) localStorage.removeItem(KEYS.live);
};

export function clearAllRL() {
  if (!hasLS()) return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
