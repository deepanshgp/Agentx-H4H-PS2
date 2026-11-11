"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackBlockchainTransactions, getWeb3Status } from "@/lib/web3-integration";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLinkIcon } from "lucide-react";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
  gasUsed?: string;
  gasPrice?: string;
  status?: 'pending' | 'confirmed' | 'failed';
}

export function BlockchainTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    const { isConnected, chainId } = getWeb3Status();
    if (!isConnected) {
      setIsLoading(false);
      return;
    }
    
    // Mock transactions for demonstration
    const mockTransactions: Transaction[] = [
      {
        hash: '0x' + Math.random().toString(16).substr(2, 64),
        from: '0x' + Math.random().toString(16).substr(2, 40),
        to: '0x' + Math.random().toString(16).substr(2, 40),
        value: (Math.random() * 2).toFixed(4),
        timestamp: Date.now() - Math.floor(Math.random() * 3600000),
        blockNumber: 17500000 + Math.floor(Math.random() * 1000),
        status: 'confirmed'
      },
      {
        hash: '0x' + Math.random().toString(16).substr(2, 64),
        from: '0x' + Math.random().toString(16).substr(2, 40),
        to: '0x' + Math.random().toString(16).substr(2, 40),
        value: (Math.random() * 0.5).toFixed(4),
        timestamp: Date.now() - Math.floor(Math.random() * 1800000),
        blockNumber: 17500000 + Math.floor(Math.random() * 1000),
        status: 'confirmed'
      },
      {
        hash: '0x' + Math.random().toString(16).substr(2, 64),
        from: '0x' + Math.random().toString(16).substr(2, 40),
        to: '0x' + Math.random().toString(16).substr(2, 40),
        value: (Math.random() * 0.1).toFixed(4),
        timestamp: Date.now() - Math.floor(Math.random() * 600000),
        blockNumber: 17500000 + Math.floor(Math.random() * 1000),
        status: 'pending'
      }
    ];
    
    setTransactions(mockTransactions);
    setIsLoading(false);
    
    // In a real implementation, you would use the trackBlockchainTransactions function
    // const stopTracking = trackBlockchainTransactions((tx) => {
    //   setTransactions(prev => [tx, ...prev].slice(0, 10));
    // });
    
    // return () => {
    //   stopTracking();
    // };
  }, []);

  // Set up event listener for wallet connection changes
  useEffect(() => {
    const handleStorageChange = () => {
      const status = getWeb3Status();
      if (!status.isConnected) {
        setTransactions([]);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format timestamp to relative time
  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds} sec ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  // Get block explorer URL based on chain ID
  const getBlockExplorerUrl = (hash: string) => {
    const { chainId } = getWeb3Status();
    
    // Default to Ethereum mainnet
    if (!chainId || chainId === 1) {
      return `https://etherscan.io/tx/${hash}`;
    }
    
    // Add more networks as needed
    switch (chainId) {
      case 56: // BSC
        return `https://bscscan.com/tx/${hash}`;
      case 137: // Polygon
        return `https://polygonscan.com/tx/${hash}`;
      case 42161: // Arbitrum
        return `https://arbiscan.io/tx/${hash}`;
      case 10: // Optimism
        return `https://optimistic.etherscan.io/tx/${hash}`;
      default:
        return `https://etherscan.io/tx/${hash}`;
    }
  };

  // Get status badge color
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const { isConnected } = getWeb3Status();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-Time Blockchain Transactions</CardTitle>
        <CardDescription>
          Monitor the latest transactions on the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">Wallet Not Connected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect your wallet to track blockchain transactions
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">No Transactions</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No blockchain transactions have been detected yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.hash} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate max-w-[200px]">
                        {formatAddress(tx.hash)}
                      </p>
                      <a
                        href={getBlockExplorerUrl(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Block: {tx.blockNumber} • {formatRelativeTime(tx.timestamp)}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(tx.status)}
                    <p className="font-medium mt-1">{tx.value} ETH</p>
                  </div>
                </div>
                
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">From</p>
                    <p className="truncate">{formatAddress(tx.from)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">To</p>
                    <p className="truncate">{formatAddress(tx.to)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
