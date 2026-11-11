"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import { getPortfolioPerformanceData } from "@/lib/portfolio-tracker"

interface PerformanceDataPoint {
  month: string;
  value: number;
}

export default function PortfolioPerformance() {
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])

  useEffect(() => {
    // Load initial data
    updatePerformanceData()
    
    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(() => {
      updatePerformanceData()
    }, 5 * 60 * 1000)
    
    return () => clearInterval(intervalId)
  }, [])
  
  const updatePerformanceData = () => {
    // Get portfolio performance data from tracker
    const { labels, data } = getPortfolioPerformanceData(12)
    
    // Format data for chart
    const chartData = labels.map((month, index) => ({
      month,
      value: data[index] || 0
    }))
    
    setPerformanceData(chartData)
  }

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `₹${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}K`
    }
    return `₹${value}`
  }

  const formatTooltip = (value: number) => {
    return `₹${value.toLocaleString("en-IN")}`
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={performanceData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatYAxis} />
          <Tooltip formatter={formatTooltip} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" activeDot={{ r: 8 }} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
