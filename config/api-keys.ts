// API keys — all NEXT_PUBLIC_ so they are available in the browser bundle.
// Server-side-only vars (without NEXT_PUBLIC_) are stripped by Next.js at build time
// and will always be empty string on the client.

export const API_KEYS = {
  GEMINI:   process.env.NEXT_PUBLIC_GEMINI_API_KEY   || "",
  GROQ:     process.env.NEXT_PUBLIC_GROQ_API_KEY     || "",
  NEWSDATA: process.env.NEXT_PUBLIC_NEWSDATA_API_KEY || "",
  // NVIDIA key — NEXT_PUBLIC_ prefix required for browser access
  NVIDIA:   process.env.NEXT_PUBLIC_NVIDIA_API_KEY   || "",
};
