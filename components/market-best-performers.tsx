"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MarketBestPerformersProps {
  assets: Array<{
    name: string
    ticker: string
    price: number
    change: number
    marketCap: string
    volume: string
  }>
  onBuy: (asset: any) => void
}

export function MarketBestPerformers({ assets, onBuy }: MarketBestPerformersProps) {
  // Sort assets by change percentage and get top 3
  const bestPerformers = [...assets]
    .sort((a, b) => b.change - a.change)
    .slice(0, 3)

  return (
    <div className="mb-6 p-6 rounded-lg bg-amber-50/50">
      <h3 className="text-lg font-semibold mb-4">Best Performers</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bestPerformers.map((asset) => (
          <Card key={asset.ticker}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {asset.name}
                <div className="text-xs text-muted-foreground">{asset.ticker}</div>
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{asset.price.toLocaleString()}</div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-green-500">
                  +{asset.change.toFixed(2)}%
                </p>
                <Button
                  onClick={() => onBuy(asset)}
                  size="sm"
                  className="bg-action-buy-light text-action-buy hover:bg-action-buy hover:text-white transition-colors"
                >
                  Buy
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
