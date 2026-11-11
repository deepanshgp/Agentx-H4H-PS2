"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { getUserPortfolio } from "@/lib/portfolio-tracker";
import { Pnl } from "@/components/ui-kit/pnl";
import { formatINR } from "@/lib/format";

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

  // Same data, but show a helpful empty state instead of vanishing from the grid
  if (!bestPerformer) {
    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-dashed bg-card/60 p-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Trophy className="h-4 w-4" />
        </div>
        <div className="mt-6">
          <p className="text-sm font-medium">Best performer</p>
          <p className="mt-1 text-sm text-muted-foreground">Your top gainer shows up here once you hold an asset in profit.</p>
          <Link href="/dashboard/stocks" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Explore markets</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border bg-card p-6 shadow-card transition-colors hover:border-gain/40">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Best performer</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gain/10 text-gain">
          <Trophy className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-6">
        <p className="truncate text-xl font-semibold tracking-tight">{bestPerformer.name}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">{bestPerformer.type}</span>
          <Pnl value={bestPerformer.profitPercentage} variant="pill" size="sm" />
        </div>
        <p className="num mt-3 text-sm text-muted-foreground">
          Holding value <span className="font-medium text-foreground">{formatINR(bestPerformer.totalValue)}</span>
        </p>
      </div>
    </div>
  );
}
