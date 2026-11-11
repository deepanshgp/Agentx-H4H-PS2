'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"
import { cryptoData, userCrypto } from "@/lib/data"
import { fetchRealTimeCryptoData, updatePortfolioWithRealTimeData } from "@/lib/market-api"
import AssetBuyModal from "@/components/asset-buy-modal"
import AssetSellModal from "@/components/asset-sell-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Web3WalletConnect from "@/components/web3-wallet-connect"
import { MarketBestPerformers } from "@/components/market-best-performers"
import TopTraders from "@/components/top-traders"

export default function CryptoPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [marketCrypto, setMarketCrypto] = useState<any[]>([])
  const [userCrypto, setUserCrypto] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showSellModal, setShowSellModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Function to load user portfolio from localStorage
  const loadUserPortfolio = () => {
    try {
      const savedPortfolio = localStorage.getItem("userCrypto")
      if (savedPortfolio) {
        setUserCrypto(JSON.parse(savedPortfolio))
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
      // Fetch real-time crypto data
      const cryptoData = await fetchRealTimeCryptoData()
      setMarketCrypto(cryptoData)
      
      // Load user portfolio from localStorage
      loadUserPortfolio()
      
      // If user has crypto, update with real-time data
      const savedPortfolio = localStorage.getItem("userCrypto")
      if (savedPortfolio) {
        const userPortfolio = JSON.parse(savedPortfolio)
        const updatedPortfolio = updatePortfolioWithRealTimeData(userPortfolio, cryptoData)
        setUserCrypto(updatedPortfolio)
        
        // Save updated portfolio with real-time prices back to localStorage
        localStorage.setItem("userCrypto", JSON.stringify(updatedPortfolio))
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

  const filteredUserCrypto = userCrypto.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.ticker.toLowerCase().includes(searchTerm.toLowerCase()),
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

      <MarketBestPerformers assets={marketCrypto} onBuy={handleBuy} />

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
                          <div key={crypto.id} className="grid grid-cols-7 p-4 text-sm">
                            <div className="col-span-2">
                              <div className="font-medium">{crypto.name}</div>
                              <div className="text-xs text-gray-500">{crypto.ticker}</div>
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
                                onClick={() => handleBuy(crypto)}
                                className="bg-action-buy-light text-action-buy hover:bg-action-buy hover:text-white transition-colors"
                              >
                                Buy
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">No cryptocurrencies found</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="portfolio" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Crypto Portfolio</CardTitle>
                  <CardDescription>Manage your cryptocurrency investments</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="p-4 text-center">Updating portfolio with real-time data...</div>
                  ) : filteredUserCrypto.length > 0 ? (
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
                        {filteredUserCrypto.map((crypto) => (
                          <div key={crypto.id} className="grid grid-cols-9 p-4 text-sm">
                            <div className="col-span-2">
                              <div className="font-medium">{crypto.name}</div>
                              <div className="text-xs text-gray-500">{crypto.ticker}</div>
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
                            <div className="col-span-1 flex items-center text-gray-500">{crypto.quantity}</div>
                            <div className="col-span-1 flex items-center text-gray-500">
                              ₹{crypto.avgBuyPrice.toLocaleString("en-IN")}
                            </div>
                            <div className="col-span-1 flex items-center font-medium">
                              ₹{crypto.totalValue.toLocaleString("en-IN")}
                            </div>
                            <div
                              className={`col-span-1 flex items-center ${
                                crypto.profit >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {crypto.profit >= 0 ? "+" : ""}₹{crypto.profit.toLocaleString("en-IN")}
                              <span className="ml-1 text-xs">({crypto.profitPercentage.toFixed(2)}%)</span>
                            </div>
                            <div className="col-span-1 flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBuy(crypto)}
                                className="bg-action-buy-light text-action-buy hover:bg-action-buy hover:text-white transition-colors"
                              >
                                Buy
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSell(crypto)}
                                className="bg-action-sell-light text-action-sell hover:bg-action-sell hover:text-white transition-colors ml-2"
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
                      <p className="text-muted-foreground mb-4">You don't own any cryptocurrencies yet.</p>
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
        
        <div className="w-full md:w-1/4 space-y-6">
          <Web3WalletConnect />
          <TopTraders assetType="crypto" />
        </div>
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
