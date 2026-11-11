"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MarketPriceChart from "@/components/market-price-chart";

interface MarketBestPerformersProps {
  assets: Array<{
    id: string | number;
    name: string;
    ticker: string;
    price: number;
    change: number;
    marketCap: string;
    volume: string;
  }>;
  onBuy: (asset: any) => void;
  onChart?: (asset: any) => void;
  selectedAsset?: any;
  assetType?: "stock" | "crypto";
  chartLocation?: "performer" | "row";
}

export function MarketBestPerformers({ assets, onBuy, onChart, selectedAsset, assetType, chartLocation }: MarketBestPerformersProps) {
  const bestPerformers = [...assets]
    .sort((a, b) => b.change - a.change)
    .slice(0, 3);
  const selectedPerformer = chartLocation === "performer"
    ? bestPerformers.find((asset) => asset.id === selectedAsset?.id)
    : undefined;
  const displayedPerformers = selectedPerformer
    ? [selectedPerformer, ...bestPerformers.filter((asset) => asset.id !== selectedPerformer.id)]
    : bestPerformers;

  return (
    <div className="mb-6 p-5 rounded-xl border border-border bg-gradient-to-r from-primary/5 to-accent/50">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Top Performers Today
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayedPerformers.map((asset) => {
          const rank = bestPerformers.findIndex((performer) => performer.id === asset.id);
          const isExpanded = selectedPerformer?.id === asset.id;
          const isPositive = asset.change >= 0;
          return (
            <Card
              key={asset.ticker}
              role={onChart ? "button" : undefined}
              tabIndex={onChart ? 0 : undefined}
              aria-expanded={onChart ? chartLocation === "performer" && selectedAsset?.id === asset.id : undefined}
              onClick={() => onChart?.(asset)}
              onKeyDown={(event) => {
                if (onChart && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onChart(asset);
                }
              }}
              className={`border-border hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isExpanded ? "md:col-span-3" : ""}`}
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
                    onClick={(event) => {
                      event.stopPropagation();
                      onBuy(asset);
                    }}
                    size="sm"
                    className="bg-action-buy hover:bg-action-buy-hover text-white h-7 px-3 text-xs"
                  >
                    Buy
                  </Button>
                </div>
                {selectedAsset?.id === asset.id && chartLocation === "performer" && assetType && (
                  <div className="mt-4 border-t pt-4" onClick={(event) => event.stopPropagation()}>
                    <MarketPriceChart
                      asset={{
                        id: String(assetType === "stock" ? asset.ticker ?? asset.id : asset.id),
                        name: asset.name,
                        ticker: asset.ticker ?? String(asset.id),
                      }}
                      assetType={assetType}
                      currentPrice={asset.price}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
