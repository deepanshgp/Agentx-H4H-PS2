// API keys configuration
// In production and source control, keys are loaded from environment variables

export const API_KEYS = {
  GEMINI: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  GROQ: process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '',
  NEWSDATA: process.env.NEXT_PUBLIC_NEWSDATA_API_KEY || process.env.NEWSDATA_API_KEY || '',
};
