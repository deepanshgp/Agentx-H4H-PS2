"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, ReferenceLine } from "recharts"

interface PriceData {
  timestamp: string
  price: number
}

interface AssetPriceChartProps {
  assetId: string
  assetType: "stock" | "crypto" | "insurance"
}

export function AssetPriceChart({ assetId, assetType }: AssetPriceChartProps) {
  const [timeRange, setTimeRange] = useState<"1D" | "1W" | "1M" | "1Y">("1M")
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [priceChange, setPriceChange] = useState<{ value: number; percentage: number }>({ value: 0, percentage: 0 })

  useEffect(() => {
    const fetchPriceHistory = async () => {
      setIsLoading(true)
      try {
        // Simulate API call for price history
        // In a real app, you would fetch this from your backend
        const now = new Date()
        const data: PriceData[] = []
        
        // Generate mock data based on time range
        const points = timeRange === "1D" ? 24 : timeRange === "1W" ? 7 : timeRange === "1M" ? 30 : 365
        const interval = timeRange === "1D" ? 60 * 60 * 1000 : // 1 hour
                        timeRange === "1W" ? 24 * 60 * 60 * 1000 : // 1 day
                        timeRange === "1M" ? 24 * 60 * 60 * 1000 : // 1 day
                        7 * 24 * 60 * 60 * 1000 // 1 week
        
        let basePrice = assetType === "crypto" ? 40000 : 1000; // Mock base price
        const volatility = assetType === "crypto" ? 0.1 : 0.03; // Mock volatility
        
        // Make the chart more realistic with a trend
        const trend = Math.random() > 0.5 ? 1 : -1; // Random up or down trend
        const trendStrength = Math.random() * 0.01; // Random trend strength
        
        for (let i = points - 1; i >= 0; i--) {
          const timestamp = new Date(now.getTime() - (i * interval))
          
          // Add some randomness but follow the trend
          const randomChange = (Math.random() - 0.5) * volatility
          const trendChange = trend * trendStrength * (points - i)
          const totalChange = randomChange + trendChange
          
          const price = basePrice * (1 + totalChange)
          basePrice = price // Use this as the new base price for next iteration
          
          data.push({
            timestamp: timestamp.toISOString(),
            price: price
          })
        }
        
        // Calculate price change
        if (data.length > 0) {
          const firstPrice = data[0].price
          const lastPrice = data[data.length - 1].price
          const changeValue = lastPrice - firstPrice
          const changePercentage = (changeValue / firstPrice) * 100
          
          setPriceChange({
            value: changeValue,
            percentage: changePercentage
          })
        }
        
        setPriceData(data)
      } catch (error) {
        console.error("Error fetching price history:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPriceHistory()
  }, [assetId, assetType, timeRange])

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    if (timeRange === "1D") {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (timeRange === "1W" || timeRange === "1M") {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
    }
  }

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }

  // Get the color based on price change
  const getChartColor = () => {
    return priceChange.percentage >= 0 ? "#10b981" : "#ef4444"
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md">
          <p className="text-sm text-gray-500">{formatDate(label)}</p>
          <p className="text-lg font-semibold">{formatPrice(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue={timeRange} className="w-auto">
          <TabsList className="bg-gray-100 p-1">
            <TabsTrigger 
              value="1D" 
              onClick={() => setTimeRange("1D")}
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              1D
            </TabsTrigger>
            <TabsTrigger 
              value="1W" 
              onClick={() => setTimeRange("1W")}
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              1W
            </TabsTrigger>
            <TabsTrigger 
              value="1M" 
              onClick={() => setTimeRange("1M")}
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              1M
            </TabsTrigger>
            <TabsTrigger 
              value="1Y" 
              onClick={() => setTimeRange("1Y")}
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              1Y
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className={`text-sm font-medium ${priceChange.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {priceChange.percentage >= 0 ? '+' : ''}
          {priceChange.percentage.toFixed(2)}%
        </div>
      </div>

      <div className="h-[250px] w-full">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="animate-pulse flex space-x-2">
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={priceData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getChartColor()} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={getChartColor()} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                minTickGap={30}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={formatPrice}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={getChartColor()}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
                activeDot={{ r: 6, strokeWidth: 0, fill: getChartColor() }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
