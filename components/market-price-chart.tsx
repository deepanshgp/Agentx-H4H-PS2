"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CandlestickChart from "@/components/candlestick-chart"
import { fetchHistory, type Candle } from "@/lib/rl/data-client"
import type { RLAsset } from "@/lib/rl/assets"

interface MarketPriceChartProps {
  asset: { id: string; name: string; ticker: string }
  assetType: RLAsset["type"]
  currentPrice: number
}

export default function MarketPriceChart({ asset, assetType, currentPrice }: MarketPriceChartProps) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [source, setSource] = useState<"live" | "synthetic" | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchHistory({ id: asset.id, name: asset.name, type: assetType }, refreshKey > 0)
      .then((result) => {
        if (cancelled) return
        setCandles(result.candles)
        setSource(result.source)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : "Unable to load price history")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [asset.id, asset.name, assetType, refreshKey])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{asset.name} ({asset.ticker})</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Current price <span className="font-semibold text-foreground">₹{currentPrice.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {source && <Badge variant="outline">{source === "live" ? "Live data" : "Simulated data"}</Badge>}
          <Button
            variant="outline"
            size="icon"
            aria-label={`Refresh ${asset.name} chart`}
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : loading && candles.length === 0 ? (
          <div className="flex h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading price history…
          </div>
        ) : candles.length > 0 ? (
          <CandlestickChart candles={candles} maPeriod={20} maxCandles={100} title="" />
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No price history is available for this asset.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
