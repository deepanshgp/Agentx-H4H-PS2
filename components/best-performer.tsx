"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserPortfolio } from "@/lib/portfolio-tracker";

interface BestPerformer {
  name: string;
  type: string;
  profitPercentage: number;
  totalValue: number;
}

export function BestPerformer() {
  const [bestPerformer, setBestPerformer] = useState<BestPerformer | null>(null);

  useEffect(() => {
    const calculateBestPerformer = () => {
      const portfolio = getUserPortfolio();
      let bestAsset: BestPerformer | null = null;
      let maxProfitPercentage = -Infinity;

      // Check stocks
      portfolio.stocks.forEach((stock) => {
        if (stock.profitPercentage && stock.profitPercentage > maxProfitPercentage) {
          maxProfitPercentage = stock.profitPercentage;
          bestAsset = {
            name: stock.name,
            type: 'Stocks',
            profitPercentage: stock.profitPercentage,
            totalValue: stock.totalValue
          };
        }
      });

      // Check crypto
      portfolio.crypto.forEach((crypto) => {
        if (crypto.profitPercentage && crypto.profitPercentage > maxProfitPercentage) {
          maxProfitPercentage = crypto.profitPercentage;
          bestAsset = {
            name: crypto.name,
            type: 'Crypto',
            profitPercentage: crypto.profitPercentage,
            totalValue: crypto.totalValue
          };
        }
      });

      setBestPerformer(bestAsset);
    };

    calculateBestPerformer();
    // Update every minute
    const interval = setInterval(calculateBestPerformer, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!bestPerformer) {
    return null;
  }

  return (
    <Card className="border border-accent/10 hover:border-accent/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Best Performer</CardTitle>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="h-4 w-4 text-accent"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-dark">{bestPerformer.name}</div>
        <p className="text-xs text-gray-500">
          {bestPerformer.type} | <span className="text-accent">+{bestPerformer.profitPercentage.toFixed(2)}%</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Value: ₹{bestPerformer.totalValue.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
