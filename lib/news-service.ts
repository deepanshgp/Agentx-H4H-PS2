// News Service — fetches live financial news for the auto-trading agent
// Priority: newsdata.io (primary) → GNews (secondary) → mock headlines (fallback)

import { API_KEYS } from "@/config/api-keys";

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  relatedAssets: string[]; // asset IDs this article relates to
}

// ─── Asset keyword map ────────────────────────────────────────────────────────
// Maps asset IDs to keywords that identify them in headlines
const ASSET_KEYWORDS: Record<string, string[]> = {
  bitcoin:     ["bitcoin", "btc"],
  ethereum:    ["ethereum", "eth", "ether"],
  solana:      ["solana", "sol"],
  dogecoin:    ["dogecoin", "doge"],
  cardano:     ["cardano", "ada"],
  ripple:      ["ripple", "xrp"],
  RELIANCE:    ["reliance", "reliance industries", "ril"],
  HDFCBANK:    ["hdfc", "hdfc bank", "hdfcbank"],
  INFY:        ["infosys", "infy"],
  TCS:         ["tcs", "tata consultancy"],
  ICICIBANK:   ["icici", "icici bank", "icicibank"],
  WIPRO:       ["wipro"],
  BAJFINANCE:  ["bajaj finance", "bajfinance", "bajaj fin"],
  TATAMOTORS:  ["tata motors", "tatamotors"],
};

function extractRelatedAssets(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const [assetId, keywords] of Object.entries(ASSET_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(assetId);
    }
  }
  return matched;
}

// ─── Mock fallback headlines ──────────────────────────────────────────────────
function getMockNews(): NewsArticle[] {
  const now = new Date().toISOString();
  return [
    {
      title: "Bitcoin surges past $70,000 as institutional demand grows",
      description: "Bitcoin reached a new milestone as ETF inflows accelerate and institutional investors increase allocations to digital assets.",
      source: "CryptoNews (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["bitcoin"],
    },
    {
      title: "Reliance Industries reports record quarterly profits",
      description: "Reliance Industries posted its highest-ever quarterly net profit, driven by strong performance in its telecom and retail segments.",
      source: "Economic Times (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["RELIANCE"],
    },
    {
      title: "Ethereum network upgrade boosts transaction throughput",
      description: "The latest Ethereum protocol upgrade has significantly reduced gas fees and increased transaction speeds, boosting ETH demand.",
      source: "CoinDesk (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["ethereum"],
    },
    {
      title: "Infosys raises full-year revenue guidance amid strong deal wins",
      description: "Infosys revised its annual revenue forecast upward after securing large IT outsourcing contracts across Europe and North America.",
      source: "LiveMint (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["INFY"],
    },
    {
      title: "HDFC Bank sees slowdown in loan growth amid rising interest rates",
      description: "HDFC Bank's loan book growth slowed in Q3 as higher borrowing costs dampened demand for retail and corporate credit.",
      source: "Business Standard (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["HDFCBANK"],
    },
    {
      title: "Solana ecosystem sees record DApp activity",
      description: "Solana blockchain recorded its highest-ever daily active users as DeFi and NFT activity continues to grow on the network.",
      source: "The Block (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["solana"],
    },
    {
      title: "TCS wins $2 billion cloud transformation deal",
      description: "Tata Consultancy Services announced a landmark cloud transformation deal that analysts expect to significantly boost revenue.",
      source: "Financial Express (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["TCS"],
    },
    {
      title: "Dogecoin drops 15% after Elon Musk comment",
      description: "DOGE fell sharply after a cryptic social media post raised concerns about the memecoin's long-term utility.",
      source: "CoinTelegraph (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["dogecoin"],
    },
    {
      title: "Wipro wins multi-year IT services contract from European bank",
      description: "Wipro secured a significant IT outsourcing deal that will drive revenue growth over the next five years.",
      source: "LiveMint (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["WIPRO"],
    },
    {
      title: "ICICI Bank reports strong Q3 earnings with net profit up 25%",
      description: "ICICI Bank's quarterly results beat analyst expectations, driven by robust retail lending and fee income growth.",
      source: "Business Today (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["ICICIBANK"],
    },
    {
      title: "Tata Motors EV sales hit record high in India",
      description: "Tata Motors reported record electric vehicle sales driven by strong demand for the Nexon EV and new model launches.",
      source: "Auto Today (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["TATAMOTORS"],
    },
    {
      title: "Bajaj Finance raises lending rates amid RBI policy tightening",
      description: "Bajaj Finance announced an increase in its lending rates following the Reserve Bank of India's latest monetary policy decision.",
      source: "Economic Times (mock)",
      publishedAt: now,
      url: "#",
      relatedAssets: ["BAJFINANCE"],
    },
  ];
}

// ─── newsdata.io fetcher (primary) ────────────────────────────────────────────
async function fetchFromNewsdata(
  apiKey: string,
  maxArticles: number
): Promise<NewsArticle[] | null> {
  try {
    // newsdata.io free tier: business + technology news, India region
    const url =
      `https://newsdata.io/api/1/news` +
      `?apikey=${apiKey}` +
      `&q=stock+market+OR+cryptocurrency+OR+bitcoin+OR+NSE+OR+BSE+OR+Nifty+OR+Sensex+OR+RBI` +
      `&language=en` +
      `&country=in` +
      `&category=business,technology`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`newsdata.io returned ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== "success" || !Array.isArray(data.results)) {
      throw new Error(`newsdata.io unexpected response: ${data.message || data.status}`);
    }

    const articles: NewsArticle[] = data.results
      .slice(0, maxArticles * 2) // fetch extra, then filter
      .map((a: any) => ({
        title:        a.title        || "",
        description:  a.description  || a.content || "",
        source:       a.source_id    || "newsdata.io",
        publishedAt:  a.pubDate      || new Date().toISOString(),
        url:          a.link         || "#",
        relatedAssets: extractRelatedAssets(`${a.title} ${a.description || ""} ${a.content || ""}`),
      }))
      .filter((a: NewsArticle) => a.relatedAssets.length > 0);

    return articles.slice(0, maxArticles);
  } catch (err) {
    console.warn("[NewsService] newsdata.io failed:", err);
    return null;
  }
}

// ─── GNews fetcher (secondary) ────────────────────────────────────────────────
async function fetchFromGnews(
  apiKey: string,
  maxArticles: number
): Promise<NewsArticle[] | null> {
  try {
    const query = encodeURIComponent(
      "stock market OR cryptocurrency OR bitcoin OR ethereum OR NSE OR BSE OR Nifty OR Sensex"
    );
    const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&country=in&max=${maxArticles}&apikey=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`GNews returned ${response.status}`);

    const data = await response.json();
    const articles: NewsArticle[] = (data.articles || []).map((a: any) => ({
      title:        a.title               || "",
      description:  a.description         || "",
      source:       a.source?.name        || "GNews",
      publishedAt:  a.publishedAt         || new Date().toISOString(),
      url:          a.url                 || "#",
      relatedAssets: extractRelatedAssets(`${a.title} ${a.description}`),
    })).filter((a: NewsArticle) => a.relatedAssets.length > 0);

    return articles.length > 0 ? articles.slice(0, maxArticles) : null;
  } catch (err) {
    console.warn("[NewsService] GNews failed:", err);
    return null;
  }
}

// ─── Main exported function ───────────────────────────────────────────────────

export interface NewsServiceConfig {
  newsdataApiKey?: string;
  gnewsApiKey?: string;
}

/**
 * Fetch live financial news.
 * Priority: newsdata.io → GNews → mock headlines
 */
export async function fetchFinancialNews(
  gnewsApiKey: string,
  maxArticles: number = 10,
  extraConfig?: NewsServiceConfig
): Promise<NewsArticle[]> {
  // Resolve newsdata key: explicit config → env var → hardcoded in api-keys.ts
  const newsdataKey =
    extraConfig?.newsdataApiKey ||
    process.env.NEXT_PUBLIC_NEWSDATA_API_KEY ||
    API_KEYS.NEWSDATA;

  // 1. Try newsdata.io
  if (newsdataKey && newsdataKey !== "YOUR_NEWSDATA_API_KEY") {
    const articles = await fetchFromNewsdata(newsdataKey, maxArticles);
    if (articles && articles.length > 0) {
      console.info(`[NewsService] newsdata.io — ${articles.length} articles`);
      return articles;
    }
  }

  // 2. Try GNews
  const gnewsKey = extraConfig?.gnewsApiKey || gnewsApiKey;
  if (gnewsKey && gnewsKey !== "YOUR_GNEWS_API_KEY") {
    const articles = await fetchFromGnews(gnewsKey, maxArticles);
    if (articles && articles.length > 0) {
      console.info(`[NewsService] GNews — ${articles.length} articles`);
      return articles;
    }
  }

  // 3. Fall back to mock headlines
  console.info("[NewsService] Using mock headlines (no live API available)");
  return getMockNews().slice(0, maxArticles);
}

/**
 * Build a compact news summary string to pass to the LLM for a specific asset.
 */
export function buildNewsSummaryForAsset(
  articles: NewsArticle[],
  assetId: string
): string {
  const relevant = articles.filter((a) => a.relatedAssets.includes(assetId));
  if (relevant.length === 0) return "No recent news found for this asset.";

  return relevant
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}: ${a.description}`)
    .join("\n");
}
