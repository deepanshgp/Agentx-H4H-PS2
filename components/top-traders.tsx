"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, TrendingUp, Award, Zap } from "lucide-react"
import { fetchTopTradersData, Trader } from "@/lib/market-api"

interface TopTradersProps {
  assetType: "crypto" | "stock"
}

export default function TopTraders({ assetType }: TopTradersProps) {
  const [traders, setTraders] = useState<Trader[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTraders = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Fetch real trader data based on market trends
        const tradersData = await fetchTopTradersData(assetType)
        
        if (tradersData.length === 0) {
          throw new Error("Could not fetch trader data")
        }
        
        setTraders(tradersData)
      } catch (err) {
        console.error("Error fetching top traders:", err)
        setError("Failed to load top traders data")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTraders()
    
    // Set up auto-refresh every 10 minutes
    const intervalId = setInterval(fetchTraders, 10 * 60 * 1000)
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [assetType])

  const getBadgeComponent = (badge?: string) => {
    if (!badge) return null
    
    switch (badge) {
      case "expert":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            <Award className="h-3 w-3 mr-1" /> Expert
          </Badge>
        )
      case "rising":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
            <TrendingUp className="h-3 w-3 mr-1" /> Rising Star
          </Badge>
        )
      case "new":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
            <Zap className="h-3 w-3 mr-1" /> New
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top {assetType === "crypto" ? "Crypto" : "Stock"} Traders</CardTitle>
        <CardDescription>
          Highest performing traders in the {assetType === "crypto" ? "cryptocurrency" : "stock"} market
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-pulse flex space-x-2">
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-40 text-red-500">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {traders.map((trader, index) => (
              <div key={trader.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-lg font-bold text-gray-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center">
                      <p className="font-medium">{trader.name}</p>
                      <div className="ml-2">
                        {getBadgeComponent(trader.badge)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Specialty: {trader.specialty}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-green-600 font-medium">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    {trader.performance}%
                  </div>
                  <p className="text-xs text-gray-500">
                    {trader.winRate}% win rate ({trader.totalTrades} trades)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
