"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { useEffect, useState } from "react"
import { calculateAssetAllocation } from "@/lib/portfolio-tracker"

const COLORS = ["#3b82f6", "#10b981", "#6366f1"]

export default function AssetAllocation() {
  const [allocationData, setAllocationData] = useState([
    { name: "Stocks", value: 0 },
    { name: "Crypto", value: 0 },
    { name: "Insurance", value: 0 },
  ])

  useEffect(() => {
    // Load initial data
    updateAllocationData()
    
    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(() => {
      updateAllocationData()
    }, 5 * 60 * 1000)
    
    return () => clearInterval(intervalId)
  }, [])
  
  const updateAllocationData = () => {
    // Get asset allocation from portfolio tracker
    const allocation = calculateAssetAllocation()
    
    // Update chart data
    setAllocationData([
      { name: "Stocks", value: allocation.stocks },
      { name: "Crypto", value: allocation.crypto },
      { name: "Insurance", value: allocation.insurance },
    ])
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={allocationData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {allocationData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
