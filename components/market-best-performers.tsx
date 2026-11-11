"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MarketBestPerformersProps {
  assets: Array<{
    name: string;
    ticker: string;
    price: number;
    change: number;
    marketCap: string;
    volume: string;
  }>;
  onBuy: (asset: any) => void;
}

export function MarketBestPerformers({ assets, onBuy }: MarketBestPerformersProps) {
  const bestPerformers = [...assets]
    .sort((a, b) => b.change - a.change)
    .slice(0, 3);

  return (
    <div className="mb-6 p-5 rounded-xl border border-border bg-gradient-to-r from-primary/5 to-accent/50">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Top Performers Today
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bestPerformers.map((asset, rank) => {
          const isPositive = asset.change >= 0;
          return (
            <Card
              key={asset.ticker}
              className="border-border hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* rank accent stripe */}
              <div
                className={`h-1 w-full ${
                  rank === 0 ? "bg-amber-400" : rank === 1 ? "bg-slate-400" : "bg-orange-400"
                }`}
              />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-3 px-4">
                <div>
                  <CardTitle className="text-sm font-semibold leading-tight">{asset.name}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-0.5">{asset.ticker}</div>
                </div>
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full ${
                    isPositive ? "bg-action-buy/10" : "bg-action-sell/10"
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-4 w-4 text-action-buy" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-action-sell" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-dark">
                  ₹{asset.price.toLocaleString("en-IN")}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Badge
                    className={`text-xs font-semibold ${
                      isPositive
                        ? "bg-action-buy/10 text-action-buy border-action-buy/20"
                        : "bg-action-sell/10 text-action-sell border-action-sell/20"
                    }`}
                    variant="outline"
                  >
                    {isPositive ? "+" : ""}
                    {asset.change.toFixed(2)}%
                  </Badge>
                  <Button
                    onClick={() => onBuy(asset)}
                    size="sm"
                    className="bg-action-buy hover:bg-action-buy-hover text-white h-7 px-3 text-xs"
                  >
                    Buy
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
