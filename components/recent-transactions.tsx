import { Avatar } from "@/components/ui/avatar"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useEffect, useState } from "react"
import { getRecentTransactions, Transaction } from "@/lib/portfolio-tracker"

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    // Load initial data
    updateTransactions()
    
    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(() => {
      updateTransactions()
    }, 5 * 60 * 1000)
    
    return () => clearInterval(intervalId)
  }, [])
  
  const updateTransactions = () => {
    // Get recent transactions from portfolio tracker
    const recentTransactions = getRecentTransactions(10)
    setTransactions(recentTransactions)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value)
  }
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const formatQuantity = (transaction: Transaction) => {
    if (transaction.assetType === 'stock') {
      return `${transaction.quantity} shares`
    } else if (transaction.assetType === 'crypto') {
      const assetId = typeof transaction.assetId === 'string' ? transaction.assetId.toUpperCase() : transaction.assetId;
      return `${transaction.quantity} ${assetId}`
    } else {
      return `${transaction.quantity} units`
    }
  }

  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          <p>No transactions yet. Start investing to see your transaction history!</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="grid grid-cols-7 p-4 text-sm font-medium text-gray-500">
            <div className="col-span-3">Asset</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Amount</div>
            <div className="col-span-1">Quantity</div>
            <div className="col-span-1 text-right">Date</div>
          </div>
          <div className="divide-y">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="grid grid-cols-7 p-4 text-sm">
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9 rounded-md">
                    <div
                      className={`h-full w-full rounded-md ${
                        transaction.assetType === "stock"
                          ? "bg-blue-100"
                          : transaction.assetType === "crypto"
                            ? "bg-green-100"
                            : "bg-indigo-100"
                      }`}
                    >
                      <span
                        className={`flex h-full w-full items-center justify-center text-xs font-bold ${
                          transaction.assetType === "stock"
                            ? "text-blue-700"
                            : transaction.assetType === "crypto"
                              ? "text-green-700"
                              : "text-indigo-700"
                        }`}
                      >
                        {transaction.assetName.charAt(0)}
                      </span>
                    </div>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center gap-1.5">
                      {transaction.assetName}
                      {transaction.id.startsWith("agent-") && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-semibold">
                          AI Agent
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{transaction.assetType.charAt(0).toUpperCase() + transaction.assetType.slice(1)}</div>
                  </div>
                </div>
                <div className="col-span-1 flex items-center">
                  <div className={`flex items-center ${transaction.type === "buy" ? "text-green-600" : "text-red-600"}`}>
                    {transaction.type === "buy" ? (
                      <ArrowUpRight className="mr-1 h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="mr-1 h-4 w-4" />
                    )}
                    {transaction.type === "buy" ? "Buy" : "Sell"}
                  </div>
                </div>
                <div className="col-span-1 flex items-center font-medium">{formatCurrency(transaction.totalValue)}</div>
                <div className="col-span-1 flex items-center text-gray-500">{formatQuantity(transaction)}</div>
                <div className="col-span-1 flex items-center justify-end text-gray-500">{formatDate(transaction.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
