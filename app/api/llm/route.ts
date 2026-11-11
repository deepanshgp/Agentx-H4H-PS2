// Server-side LLM proxy — avoids CORS by calling NVIDIA/Groq from the server.
// Browser calls POST /api/llm  →  this route forwards to NVIDIA or Groq  →  returns JSON.
//
// Keys are read from server-side env vars (no NEXT_PUBLIC_ prefix needed here).

import { NextRequest, NextResponse } from "next/server";

// ─── Config ───────────────────────────────────────────────────────────────────

const NVIDIA_BASE  = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
const GROQ_BASE    = "https://api.groq.com/openai/v1";
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_MODEL2  = "llama3-70b-8192";

// Server-side key resolution — these are never exposed to the browser bundle.
// Falls back to NEXT_PUBLIC_ variants so a single .env.local entry works for both.
const NVIDIA_KEY =
  process.env.NVIDIA_API_KEY ||
  process.env.NEXT_PUBLIC_NVIDIA_API_KEY ||
  "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";

const GROQ_KEY =
  process.env.GROQ_API_KEY ||
  process.env.NEXT_PUBLIC_GROQ_API_KEY ||
  "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJSON(text: string): string {
  // Strip markdown code fences
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Find the outermost { ... } using brace matching
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in LLM response");
  cleaned = cleaned.slice(start);

  let depth = 0;
  let end = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  // If truncated, close the object and try anyway
  const jsonStr = end !== -1 ? cleaned.slice(0, end + 1) : cleaned + "}";

  try {
    JSON.parse(jsonStr); // validate
    return jsonStr;
  } catch {
    // Remove trailing commas and pipe-style schema hints
    const sanitised = jsonStr
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/"[^"]*"\|"[^"]*"/g, '"hold"');
    JSON.parse(sanitised); // throws if still bad
    return sanitised;
  }
}

async function callNvidia(
  system: string,
  user: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const systemWithJSON =
    system +
    "\n\nCRITICAL: Your response MUST be a single valid JSON object. " +
    "No markdown, no code fences, no text before or after. Start with { and end with }.";

  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NVIDIA_KEY}`,
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [
        { role: "system", content: systemWithJSON },
        { role: "user",   content: user           },
      ],
      temperature,
      max_tokens: Math.max(maxTokens, 1500), // reasoning model needs extra tokens
      stream: false,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`NVIDIA HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0]?.message;
  // Nemotron is a reasoning model — final answer in `content`, thinking in `reasoning_content`
  const content: string = choice?.content || choice?.reasoning_content || "";
  if (!content) throw new Error("NVIDIA returned empty content");
  return extractJSON(content);
}

async function callGroq(
  model: string,
  system: string,
  user: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq ${model} HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error(`Groq ${model} returned empty content`);
  return extractJSON(content);
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export interface LLMProxyRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  preferProvider?: "nvidia" | "groq";
}

export async function POST(req: NextRequest) {
  try {
    const body: LLMProxyRequest = await req.json();
    const {
      systemPrompt,
      userPrompt,
      temperature = 0.4,
      maxTokens = 700,
      preferProvider,
    } = body;

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json(
        { error: "systemPrompt and userPrompt are required" },
        { status: 400 }
      );
    }

    const hasGroq   = !!GROQ_KEY && GROQ_KEY !== "YOUR_GROQ_API_KEY";
    const tryNvidia = preferProvider !== "groq" && !!NVIDIA_KEY;

    // 1. Try NVIDIA Nemotron
    if (tryNvidia) {
      try {
        const text = await callNvidia(systemPrompt, userPrompt, temperature, maxTokens);
        return NextResponse.json({ text, provider: "nvidia", model: NVIDIA_MODEL });
      } catch (err) {
        console.warn("[/api/llm] NVIDIA failed:", (err as Error).message);
      }
    }

    // 2. Try Groq LLaMA-3.3-70B
    if (hasGroq) {
      try {
        const text = await callGroq(GROQ_MODEL, systemPrompt, userPrompt, temperature, maxTokens);
        return NextResponse.json({ text, provider: "groq", model: GROQ_MODEL });
      } catch (err) {
        console.warn("[/api/llm] Groq 3.3-70B failed:", (err as Error).message);
        // 3. Groq fallback model
        try {
          const text = await callGroq(GROQ_MODEL2, systemPrompt, userPrompt, temperature, maxTokens);
          return NextResponse.json({ text, provider: "groq", model: GROQ_MODEL2 });
        } catch (err2) {
          return NextResponse.json(
            { error: `All providers failed: ${(err2 as Error).message}` },
            { status: 502 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: "No LLM API key configured on the server." },
      { status: 500 }
    );
  } catch (err) {
    console.error("[/api/llm] Unexpected error:", err);
    return NextResponse.json(
      { error: `Server error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
