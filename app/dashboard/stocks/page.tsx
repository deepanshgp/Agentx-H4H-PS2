"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowUpRight, ArrowDownRight, RefreshCw, IndianRupee } from "lucide-react"
import { fetchRealTimeStockData, updatePortfolioWithRealTimeData } from "@/lib/market-api"
import AssetBuyModal from "@/components/asset-buy-modal"
import AssetSellModal from "@/components/asset-sell-modal"
import INRBalanceModal from "@/components/inr-balance-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MarketBestPerformers } from "@/components/market-best-performers"
import MarketPriceChart from "@/components/market-price-chart"

export default function StocksPage() {
  const [marketStocks, setMarketStocks] = useState<any[]>([])
  const [chartAsset, setChartAsset] = useState<any>(null)
  const [chartLocation, setChartLocation] = useState<"performer" | "row">("row")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [inrBalance, setInrBalance] = useState(0)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  // Function to fetch market data and update portfolio
  const fetchMarketData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch real-time stock data
      const stockData = await fetchRealTimeStockData()
      setMarketStocks(stockData)

      // Keep the stored portfolio's prices current for the Portfolio dashboard.
      const savedPortfolio = localStorage.getItem("userStocks")
      if (savedPortfolio) {
        const userPortfolio = JSON.parse(savedPortfolio)
        const updatedPortfolio = updatePortfolioWithRealTimeData(userPortfolio, stockData)

        // Save updated portfolio with real-time prices back to localStorage
        localStorage.setItem("userStocks", JSON.stringify(updatedPortfolio))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to fetch data. Please try again.")

    } finally {
      setIsLoading(false)
      setLastUpdated(new Date())
    }
  }

  useEffect(() => {
    // Load INR balance
    const savedBalance = localStorage.getItem("inrBalance")
    if (savedBalance) {
      setInrBalance(Number(savedBalance))
    }
  }, [])

  const handleBalanceUpdate = (amount: number, type: 'deposit' | 'withdraw') => {
    const newBalance = type === 'deposit'
      ? inrBalance + amount
      : inrBalance - amount
    setInrBalance(newBalance)
    localStorage.setItem("inrBalance", newBalance.toString())
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchMarketData()

    // Set up auto-refresh every 5 minutes
    const intervalId = setInterval(fetchMarketData, 5 * 60 * 1000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  const filteredMarketStocks = marketStocks.filter(
    (stock) =>
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.ticker.toLowerCase().includes(searchTerm.toLowerCase()),
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stocks</h2>
          <p className="text-muted-foreground">Manage your stock investments</p>
        </div>
        <Card className="w-full md:w-auto">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">INR Balance</p>
                <h3 className="text-2xl font-bold">₹{inrBalance.toLocaleString()}</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowDepositModal(true)}
                  className="bg-action-buy-light text-action-buy hover:bg-action-buy hover:text-white transition-colors"
                >
                  <IndianRupee className="w-4 h-4 mr-1" />
                  Deposit
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowWithdrawModal(true)}
                  className="bg-action-sell-light text-action-sell hover:bg-action-sell hover:text-white transition-colors"
                  disabled={inrBalance <= 0}
                >
                  <IndianRupee className="w-4 h-4 mr-1" />
                  Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <MarketBestPerformers assets={marketStocks} onBuy={handleBuy} onChart={(asset) => toggleChart(asset, "performer")} selectedAsset={chartAsset} assetType="stock" chartLocation={chartLocation} />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search stocks..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="w-full">

              <Card>
                <CardHeader>
                  <CardTitle>Stock Market</CardTitle>
                  <CardDescription>Browse and buy stocks from the market</CardDescription>
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
                      ) : filteredMarketStocks.length > 0 ? (
                        filteredMarketStocks.map((stock) => (
                          <div key={stock.id}>
                          <div
                            className="grid grid-cols-7 p-4 text-sm cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                            role="button"
                            tabIndex={0}
                            aria-expanded={chartLocation === "row" && chartAsset?.id === stock.id}
                            aria-controls={`stock-chart-${stock.id}`}
                            onClick={() => toggleChart(stock, "row")}
                            onKeyDown={(event) => {
                              if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                                event.preventDefault()
                                toggleChart(stock, "row")
                              }
                            }}
                          >
                            <div className="col-span-2">
                              <span className="block font-medium">{stock.name}</span>
                              <span className="block text-xs text-gray-500">{stock.ticker}</span>
                            </div>
                            <div className="col-span-1 flex items-center font-medium">
                              ₹{stock.price.toLocaleString("en-IN")}
                            </div>
                            <div
                              className={`col-span-1 flex items-center ${
                                stock.change >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {stock.change >= 0 ? (
                                <ArrowUpRight className="mr-1 h-4 w-4" />
                              ) : (
                                <ArrowDownRight className="mr-1 h-4 w-4" />
                              )}
                              {Math.abs(stock.change).toFixed(2)}%
                            </div>
                            <div className="col-span-1 flex items-center text-gray-500">{stock.marketCap}</div>
                            <div className="col-span-1 flex items-center text-gray-500">{stock.volume}</div>
                            <div className="col-span-1 flex items-center justify-end">
                              <Button
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleBuy(stock)
                                }}
                                className="bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              >
                                Buy
                              </Button>
                            </div>
                          </div>
                          {chartLocation === "row" && chartAsset?.id === stock.id && (
                            <div id={`stock-chart-${stock.id}`} className="border-t bg-muted/20 p-4">
                              <MarketPriceChart
                                asset={{
                                  id: String(stock.ticker ?? stock.id),
                                  name: stock.name,
                                  ticker: stock.ticker ?? String(stock.id),
                                }}
                                assetType="stock"
                                currentPrice={stock.price}
                              />
                            </div>
                          )}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">No stocks found</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
      </div>

      {showBuyModal && selectedAsset && (
        <AssetBuyModal
          asset={selectedAsset}
          assetType="stock"
          open={showBuyModal}
          onClose={() => setShowBuyModal(false)}
        />
      )}

      {showSellModal && selectedAsset && (
        <AssetSellModal
          asset={selectedAsset}
          assetType="stock"
          open={showSellModal}
          onClose={() => setShowSellModal(false)}
        />
      )}

      <INRBalanceModal
        open={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onSuccess={handleBalanceUpdate}
        type="deposit"
      />
      <INRBalanceModal
        open={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={handleBalanceUpdate}
        type="withdraw"
      />
    </div>
  )
}
