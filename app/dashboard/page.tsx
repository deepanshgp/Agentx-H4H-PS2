"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecentTransactions from "@/components/recent-transactions";
import AssetAllocation from "@/components/asset-allocation";
import PortfolioPerformance from "@/components/portfolio-performance";
import { WalletConnection } from "@/components/wallet-connection";
import { NFTPortfolio } from "@/components/nft-portfolio";
import { TokenSwap } from "@/components/token-swap";
import { BlockchainTransactions } from "@/components/blockchain-transactions";
import { BestPerformer } from "@/components/best-performer";
import AddTestTransactionButton from "@/components/add-test-transaction-button";
import { calculateTotalPortfolioValue, calculateMonthlyChange, initializePortfolioTracker } from "@/lib/portfolio-tracker";
import { initializeWeb3Integration, calculateWeb3PortfolioValue } from "@/lib/web3-integration";

export default function DashboardPage() {
  const [totalValue, setTotalValue] = useState(0);
  const [stocksValue, setStocksValue] = useState(0);
  const [cryptoValue, setCryptoValue] = useState(0);
  const [web3Value, setWeb3Value] = useState(0);
  const [monthlyChanges, setMonthlyChanges] = useState({
    total: 0,
    stocks: 0,
    crypto: 0
  });
  const [currentTab, setCurrentTab] = useState("overview");

  useEffect(() => {
    // Initialize portfolio tracker
    initializePortfolioTracker();
    
    // Initialize Web3 integration
    initializeWeb3Integration();
    
    // Get initial portfolio values
    updatePortfolioValues();
    
    // Set up interval to update values periodically
    const intervalId = setInterval(updatePortfolioValues, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  const updatePortfolioValues = () => {
    // Get portfolio values
    const { totalValue, stocksValue, cryptoValue } = calculateTotalPortfolioValue();
    setTotalValue(totalValue);
    setStocksValue(stocksValue);
    setCryptoValue(cryptoValue);
    
    // Get Web3 portfolio value
    const web3PortfolioValue = calculateWeb3PortfolioValue();
    setWeb3Value(web3PortfolioValue);
    
    // Get monthly changes
    const changes = calculateMonthlyChange();
    setMonthlyChanges(changes);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-dark">Dashboard</h2>
        <WalletConnection />
      </div>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-5">
        <TabsList className="h-auto max-w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
          <TabsTrigger 
            value="overview"
            className="rounded-lg px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="web3"
            className="rounded-lg px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Web3
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-primary/10 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Portfolio Value
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-primary"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dark">₹{(totalValue + web3Value).toLocaleString()}</div>
                <p className={`text-xs ${
                  monthlyChanges.total >= 0 ? "text-accent" : "text-secondary"
                }`}>
                  {monthlyChanges.total >= 0 ? '+' : ''}{monthlyChanges.total}% from last month
                </p>
              </CardContent>
            </Card>
            <BestPerformer />
            <Card className="border border-secondary/10 hover:border-secondary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Stocks
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-secondary"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dark">₹{stocksValue.toLocaleString()}</div>
                <p className={`text-xs ${
                  monthlyChanges.stocks >= 0 ? "text-accent" : "text-secondary"
                }`}>
                  {monthlyChanges.stocks >= 0 ? '+' : ''}{monthlyChanges.stocks}% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="border border-warning/10 hover:border-warning/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Crypto
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-warning"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dark">₹{cryptoValue.toLocaleString()}</div>
                <p className={`text-xs ${
                  monthlyChanges.crypto >= 0 ? "text-accent" : "text-secondary"
                }`}>
                  {monthlyChanges.crypto >= 0 ? '+' : ''}{monthlyChanges.crypto}% from last month
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <PortfolioPerformance />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <AssetAllocation />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Transactions</CardTitle>
                  <AddTestTransactionButton />
                </div>
                <CardDescription>
                  Your recent investment activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentTransactions />
              </CardContent>
            </Card>
          </div>

        </TabsContent>
        
        <TabsContent value="web3" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>NFT Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <NFTPortfolio />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Token Swap</CardTitle>
              </CardHeader>
              <CardContent>
                <TokenSwap />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Blockchain Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <BlockchainTransactions />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        

        


      </Tabs>
    </div>
  );
}
