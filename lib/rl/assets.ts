// Assets the RL agent can be trained on / paper-trade. IDs match the rest of the app
// (CoinGecko ids for crypto, NSE tickers for stocks).

export interface RLAsset {
  id: string;
  name: string;
  type: "crypto" | "stock";
}

export const RL_ASSETS: RLAsset[] = [
  { id: "bitcoin", name: "Bitcoin", type: "crypto" },
  { id: "ethereum", name: "Ethereum", type: "crypto" },
  { id: "solana", name: "Solana", type: "crypto" },
  { id: "RELIANCE", name: "Reliance Industries", type: "stock" },
  { id: "TCS", name: "TCS", type: "stock" },
  { id: "INFY", name: "Infosys", type: "stock" },
  { id: "HDFCBANK", name: "HDFC Bank", type: "stock" },
  { id: "ITC", name: "ITC", type: "stock" },
];
