'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"
import { fetchRealTimeCryptoData, updatePortfolioWithRealTimeData } from "@/lib/market-api"
import AssetBuyModal from "@/components/asset-buy-modal"
import AssetSellModal from "@/components/asset-sell-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Web3WalletConnect from "@/components/web3-wallet-connect"
import { MarketBestPerformers } from "@/components/market-best-performers"
import MarketPriceChart from "@/components/market-price-chart"

export default function CryptoPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [marketCrypto, setMarketCrypto] = useState<any[]>([])
  const [chartAsset, setChartAsset] = useState<any>(null)
  const [chartLocation, setChartLocation] = useState<"performer" | "row">("row")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Function to fetch market data and update portfolio
  const fetchMarketData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch real-time crypto data
      const cryptoData = await fetchRealTimeCryptoData()
      setMarketCrypto(cryptoData)

      // Keep the stored portfolio's prices current for the Portfolio dashboard.
      const savedPortfolio = localStorage.getItem("userCrypto")
      if (savedPortfolio) {
        const userPortfolio = JSON.parse(savedPortfolio)
        const updatedPortfolio = updatePortfolioWithRealTimeData(userPortfolio, cryptoData)

        // Save updated portfolio with real-time prices back to localStorage
        localStorage.setItem("userCrypto", JSON.stringify(updatedPortfolio))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to fetch data. Please try again.")

    } finally {
      setIsLoading(false)
      setLastUpdated(new Date())
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchMarketData()

    // Set up auto-refresh every 5 minutes
    const intervalId = setInterval(fetchMarketData, 5 * 60 * 1000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  const filteredMarketCrypto = marketCrypto.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.ticker.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleBuy = (asset: any) => {
    setChartAsset(asset)
    setChartLocation("row")
    setSelectedAsset(asset)
    setShowBuyModal(true)
  }

  const toggleChart = (asset: any, location: "performer" | "row" = "row") => {
    if (chartAsset?.id === asset.id && chartLocation === location) {
      setChartAsset(null)
      return
    }
    setChartLocation(location)
    setChartAsset(asset)
  }

  const handleSell = (asset: any) => {
    setSelectedAsset(asset)
    setShowSellModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cryptocurrency</h2>
          <p className="text-muted-foreground">Manage your crypto investments</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMarketData}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <MarketBestPerformers assets={marketCrypto} onBuy={handleBuy} onChart={(asset) => toggleChart(asset, "performer")} selectedAsset={chartAsset} assetType="crypto" chartLocation={chartLocation} />

      <div className="flex justify-end">
        <Web3WalletConnect />
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search cryptocurrencies..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="w-full">

              <Card>
                <CardHeader>
                  <CardTitle>Crypto Market</CardTitle>
                  <CardDescription>Browse and buy cryptocurrencies from the market</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <div className="grid grid-cols-7 p-4 text-sm font-medium text-gray-500">
                      <div className="col-span-2">Name</div>
                      <div className="col-span-1">Price</div>
                      <div className="col-span-1">Change</div>
                      <div className="col-span-1">Market Cap</div>
                      <div className="col-span-1">Volume</div>
                      <div className="col-span-1 text-right">Action</div>
                    </div>
                    <div className="divide-y">
                      {isLoading ? (
                        <div className="p-4 text-center">Loading real-time data...</div>
                      ) : filteredMarketCrypto.length > 0 ? (
                        filteredMarketCrypto.map((crypto) => (
                          <div key={crypto.id}>
                          <div
                            className="grid grid-cols-7 p-4 text-sm cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                            role="button"
                            tabIndex={0}
                            aria-expanded={chartLocation === "row" && chartAsset?.id === crypto.id}
                            aria-controls={`crypto-chart-${crypto.id}`}
                            onClick={() => toggleChart(crypto, "row")}
                            onKeyDown={(event) => {
                              if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                                event.preventDefault()
                                toggleChart(crypto, "row")
                              }
                            }}
                          >
                            <div className="col-span-2">
                              <span className="block font-medium">{crypto.name}</span>
                              <span className="block text-xs text-gray-500">{crypto.ticker}</span>
                            </div>
                            <div className="col-span-1 flex items-center font-medium">
                              ₹{crypto.price.toLocaleString("en-IN")}
                            </div>
                            <div
                              className={`col-span-1 flex items-center ${
                                crypto.change >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {crypto.change >= 0 ? (
                                <ArrowUpRight className="mr-1 h-4 w-4" />
                              ) : (
                                <ArrowDownRight className="mr-1 h-4 w-4" />
                              )}
                              {Math.abs(crypto.change).toFixed(2)}%
                            </div>
                            <div className="col-span-1 flex items-center text-gray-500">{crypto.marketCap}</div>
                            <div className="col-span-1 flex items-center text-gray-500">{crypto.volume}</div>
                            <div className="col-span-1 flex items-center justify-end">
                              <Button
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleBuy(crypto)
                                }}
                                className="bg-action-buy-light text-action-buy hover:bg-action-buy hover:text-white transition-colors"
                              >
                                Buy
                              </Button>
                            </div>
                          </div>
                          {chartLocation === "row" && chartAsset?.id === crypto.id && (
                            <div id={`crypto-chart-${crypto.id}`} className="border-t bg-muted/20 p-4">
                              <MarketPriceChart
                                asset={{ id: String(crypto.id), name: crypto.name, ticker: crypto.ticker }}
                                assetType="crypto"
                                currentPrice={crypto.price}
                              />
                            </div>
                          )}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">No cryptocurrencies found</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
      </div>

      {showBuyModal && selectedAsset && (
        <AssetBuyModal
          asset={selectedAsset}
          assetType="crypto"
          open={showBuyModal}
          onClose={() => setShowBuyModal(false)}
        />
      )}

      {showSellModal && selectedAsset && (
        <AssetSellModal
          asset={selectedAsset}
          assetType="crypto"
          open={showSellModal}
          onClose={() => setShowSellModal(false)}
        />
      )}
    </div>
  )
}
