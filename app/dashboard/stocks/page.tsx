"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowUpRight, ArrowDownRight, RefreshCw, IndianRupee } from "lucide-react"
import { fetchRealTimeStockData, updatePortfolioWithRealTimeData } from "@/lib/market-api"
import AssetBuyModal from "@/components/asset-buy-modal"
import AssetSellModal from "@/components/asset-sell-modal"
import INRBalanceModal from "@/components/inr-balance-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MarketBestPerformers } from "@/components/market-best-performers"
import TopTraders from "@/components/top-traders"

export default function StocksPage() {
  const [marketStocks, setMarketStocks] = useState<any[]>([])
  const [userStocks, setUserStocks] = useState<any[]>([])
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

  // Function to load user portfolio from localStorage
  const loadUserPortfolio = () => {
    try {
      const savedPortfolio = localStorage.getItem("userStocks")
      if (savedPortfolio) {
        setUserStocks(JSON.parse(savedPortfolio))
      }
    } catch (error) {
      console.error("Error loading user portfolio:", error)
    }
  }

  // Function to fetch market data and update portfolio
  const fetchMarketData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch real-time stock data
      const stockData = await fetchRealTimeStockData()
      setMarketStocks(stockData)
      
      // Load user portfolio from localStorage
      loadUserPortfolio()
      
      // If user has stocks, update with real-time data
      const savedPortfolio = localStorage.getItem("userStocks")
      if (savedPortfolio) {
        const userPortfolio = JSON.parse(savedPortfolio)
        const updatedPortfolio = updatePortfolioWithRealTimeData(userPortfolio, stockData)
        setUserStocks(updatedPortfolio)
        
        // Save updated portfolio with real-time prices back to localStorage
        localStorage.setItem("userStocks", JSON.stringify(updatedPortfolio))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Failed to fetch data. Please try again.")
      
      // Load user portfolio even if market data fails
      loadUserPortfolio()
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

  const filteredUserStocks = userStocks.filter(
    (stock) =>
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.ticker.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleBuy = (asset: any) => {
    setSelectedAsset(asset)
    setShowBuyModal(true)
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

      <MarketBestPerformers assets={marketStocks} onBuy={handleBuy} />

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

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-3/4">
          <Tabs defaultValue="market" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="market"
                className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-gray-600 transition-all"
              >
                Market
              </TabsTrigger>
              <TabsTrigger 
                value="portfolio"
                className="rounded-md data-[state=active]:bg-accent data-[state=active]:text-white data-[state=inactive]:text-gray-600 transition-all"
              >
                Portfolio
              </TabsTrigger>
            </TabsList>
            <TabsContent value="market" className="mt-6">
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
                          <div key={stock.id} className="grid grid-cols-7 p-4 text-sm">
                            <div className="col-span-2">
                              <div className="font-medium">{stock.name}</div>
                              <div className="text-xs text-gray-500">{stock.ticker}</div>
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
                                onClick={() => handleBuy(stock)}
                                className="bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              >
                                Buy
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">No stocks found</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="portfolio" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Stock Portfolio</CardTitle>
                  <CardDescription>Manage your stock investments</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="p-4 text-center">Updating portfolio with real-time data...</div>
                  ) : filteredUserStocks.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-9 p-4 text-sm font-medium text-gray-500">
                        <div className="col-span-2">Name</div>
                        <div className="col-span-1">Price</div>
                        <div className="col-span-1">Change</div>
                        <div className="col-span-1">Quantity</div>
                        <div className="col-span-1">Avg. Buy</div>
                        <div className="col-span-1">Total Value</div>
                        <div className="col-span-1">Profit/Loss</div>
                        <div className="col-span-1 text-right">Action</div>
                      </div>
                      <div className="divide-y">
                        {filteredUserStocks.map((stock) => (
                          <div key={stock.id} className="grid grid-cols-9 p-4 text-sm">
                            <div className="col-span-2">
                              <div className="font-medium">{stock.name}</div>
                              <div className="text-xs text-gray-500">{stock.ticker}</div>
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
                            <div className="col-span-1 flex items-center text-gray-500">{stock.quantity}</div>
                            <div className="col-span-1 flex items-center text-gray-500">
                              ₹{stock.avgBuyPrice.toLocaleString("en-IN")}
                            </div>
                            <div className="col-span-1 flex items-center font-medium">
                              ₹{stock.totalValue.toLocaleString("en-IN")}
                            </div>
                            <div
                              className={`col-span-1 flex items-center ${
                                stock.profit >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {stock.profit >= 0 ? "+" : ""}₹{stock.profit.toLocaleString("en-IN")}
                              <span className="ml-1 text-xs">({stock.profitPercentage.toFixed(2)}%)</span>
                            </div>
                            <div className="col-span-1 flex items-center justify-end gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleBuy(stock)}
                                className="bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              >
                                Buy
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleSell(stock)}
                                className="bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              >
                                Sell
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-muted-foreground mb-4">You don't own any stocks yet.</p>
                      <Button onClick={() => {
                        const marketTab = document.querySelector('[data-state="inactive"][value="market"]') as HTMLElement;
                        marketTab?.click();
                      }}>
                        Browse Market
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="w-full md:w-1/4">
          <TopTraders assetType="stock" />
        </div>
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
