// Unified LLM client (browser-safe)
// All calls go through /api/llm (Next.js server route) to avoid CORS.
// The server route handles NVIDIA Nemotron → Groq fallback transparently.

export type LLMProvider = "nvidia" | "groq";

export interface LLMCallOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  preferProvider?: LLMProvider;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
}

// ─── Main call ────────────────────────────────────────────────────────────────

/**
 * Sends an LLM request via the /api/llm server proxy.
 * Never calls NVIDIA or Groq directly — no CORS issues.
 */
export async function callLLM(opts: LLMCallOptions): Promise<LLMResponse> {
  const {
    systemPrompt,
    userPrompt,
    temperature = 0.4,
    maxTokens = 700,
    preferProvider,
  } = opts;

  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userPrompt, temperature, maxTokens, preferProvider }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `LLM proxy error ${res.status}`);
  }

  const data: LLMResponse = await res.json();
  if (!data.text) throw new Error("LLM proxy returned empty text");
  return data;
}

// ─── UI helper ────────────────────────────────────────────────────────────────

/**
 * Returns the active provider label for display in the UI.
 * Since the server decides which provider to use, we show NVIDIA as primary
 * (the server falls back to Groq automatically if needed).
 */
export function getActiveProvider(): { provider: LLMProvider; model: string; label: string } {
  return {
    provider: "nvidia",
    model: "nvidia/nemotron-3.5-lightning-30b-a3b",
    label: "NVIDIA Nemotron-3.5-Lightning-30B",
  };
}
