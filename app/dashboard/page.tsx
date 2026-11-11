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
import { DeFiYield } from "@/components/defi-yield";
import { BlockchainTransactions } from "@/components/blockchain-transactions";
import { BestPerformer } from "@/components/best-performer";
import AddTestTransactionButton from "@/components/add-test-transaction-button";
import { calculateTotalPortfolioValue, calculateMonthlyChange, initializePortfolioTracker } from "@/lib/portfolio-tracker";
import { initializeWeb3Integration, calculateWeb3PortfolioValue } from "@/lib/web3-integration";
import AIInvestmentAdvisorMain from "@/components/ai-investment-advisor-main";
import AIPortfolioOptimizer from "@/components/ai-portfolio-optimizer";
import TradingAgentPanel from "@/components/trading-agent-panel";
import TradeJournal from "@/components/trade-journal";
import { Sparkles, Brain, TrendingUp, BarChart3, PieChart, Bot, BookOpen } from "lucide-react";
import Link from "next/link";

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
    // Check initial hash
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (["overview", "web3", "analytics", "ai-advisor", "auto-trader", "journal"].includes(hash)) {
        setCurrentTab(hash);
      }
      const handleHashChange = () => {
        const h = window.location.hash.replace("#", "");
        if (["overview", "web3", "analytics", "ai-advisor", "auto-trader", "journal"].includes(h)) {
          setCurrentTab(h);
        }
      };
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-dark">Dashboard</h2>
        <WalletConnection />
      </div>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList className="bg-gray-50 p-1">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="web3"
            className="data-[state=active]:bg-secondary data-[state=active]:text-white"
          >
            Web3
          </TabsTrigger>
          <TabsTrigger 
            value="analytics"
            className="data-[state=active]:bg-accent data-[state=active]:text-white"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="ai-advisor"
            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            AI Advisor
          </TabsTrigger>
          <TabsTrigger
            value="auto-trader"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            <Bot className="h-4 w-4 mr-1" />
            Auto Trader
          </TabsTrigger>
          <TabsTrigger
            value="journal"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Journal
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
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="col-span-1">
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
            
            <Card className="col-span-1 border border-accent/10 hover:border-accent/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-accent mr-2"
                  >
                    <path d="m2 9 3-3 3 3M13 18l3 3 3-3M9 2l3 3 3-3M18 13l3-3-3-3" />
                  </svg>
                  Investment Predictor
                </CardTitle>
                <CardDescription>
                  Predict potential returns on crypto and stock investments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-md">
                      <div className="text-xl font-bold text-accent mb-1">Crypto</div>
                      <div className="text-sm text-gray-500">Predict crypto returns</div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-md">
                      <div className="text-xl font-bold text-secondary mb-1">Stocks</div>
                      <div className="text-sm text-gray-500">Predict stock returns</div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <a 
                      href="/dashboard/predictor" 
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      Try Predictor
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="col-span-1 border border-purple-100 hover:border-purple-300 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                  AI Investment Advisor
                </CardTitle>
                <CardDescription>
                  Get personalized investment recommendations powered by advanced AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-md border border-purple-100">
                    <h3 className="text-lg font-medium text-purple-800 mb-2">Smart Investment Recommendations</h3>
                    <p className="text-sm text-purple-700 mb-4">
                      Our AI analyzes market sentiment, risk profiles, and portfolio optimization to provide personalized investment advice.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center p-2 bg-white rounded-md border border-purple-100">
                        <div className="bg-purple-100 p-2 rounded-full mr-3">
                          <Brain className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Risk Analysis</h4>
                          <p className="text-xs text-gray-500">Tailored to your profile</p>
                        </div>
                      </div>
                      <div className="flex items-center p-2 bg-white rounded-md border border-purple-100">
                        <div className="bg-purple-100 p-2 rounded-full mr-3">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Market Sentiment</h4>
                          <p className="text-xs text-gray-500">Real-time analysis</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Link 
                      href="/dashboard/ai-advisor" 
                      className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      Try AI Advisor
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 border border-blue-100 hover:border-blue-300 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                  Gemini Market Predictor
                </CardTitle>
                <CardDescription>
                  AI-powered bull or bear market predictions using Google's Gemini
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
                    <h3 className="text-lg font-medium text-blue-800 mb-2">Market Trend Analysis</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Harness the power of Google's Gemini AI to predict whether markets will be bullish or bearish.
                    </p>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="bg-green-100 p-1 rounded-full">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm font-medium ml-2">Bullish</span>
                      </div>
                      <span className="text-xs text-gray-500">or</span>
                      <div className="flex items-center">
                        <div className="bg-red-100 p-1 rounded-full">
                          <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />
                        </div>
                        <span className="text-sm font-medium ml-2">Bearish</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Link 
                      href="/dashboard/market-predictor" 
                      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Try Market Predictor
                    </Link>
                  </div>
                </div>
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
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Token Swap</CardTitle>
              </CardHeader>
              <CardContent>
                <TokenSwap />
              </CardContent>
            </Card>
            
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>DeFi Yield Farming</CardTitle>
              </CardHeader>
              <CardContent>
                <DeFiYield />
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
        
        <TabsContent value="analytics" className="space-y-4">
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
        </TabsContent>
        
        <TabsContent value="ai-advisor" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                  AI Investment Advisor
                </CardTitle>
                <CardDescription>
                  Get personalized investment recommendations powered by advanced AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-md border border-purple-100">
                    <h3 className="text-lg font-medium text-purple-800 mb-2">Smart Investment Recommendations</h3>
                    <p className="text-sm text-purple-700 mb-4">
                      Our AI analyzes market sentiment, risk profiles, and portfolio optimization to provide personalized investment advice.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center p-2 bg-white rounded-md border border-purple-100">
                        <div className="bg-purple-100 p-2 rounded-full mr-3">
                          <Brain className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Risk Analysis</h4>
                          <p className="text-xs text-gray-500">Tailored to your profile</p>
                        </div>
                      </div>
                      <div className="flex items-center p-2 bg-white rounded-md border border-purple-100">
                        <div className="bg-purple-100 p-2 rounded-full mr-3">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Market Sentiment</h4>
                          <p className="text-xs text-gray-500">Real-time analysis</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Link 
                      href="/dashboard/ai-advisor" 
                      className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      Try AI Advisor
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1 border border-blue-100 hover:border-blue-300 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                  AI Portfolio Optimizer
                </CardTitle>
                <CardDescription>
                  Optimize your portfolio allocation based on your risk profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
                    <h3 className="text-lg font-medium text-blue-800 mb-2">Smart Portfolio Optimization</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Our AI analyzes your portfolio and suggests optimal allocations to maximize returns while managing risk.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center p-2 bg-white rounded-md border border-blue-100">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <PieChart className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Diversification</h4>
                          <p className="text-xs text-gray-500">Balanced allocation</p>
                        </div>
                      </div>
                      <div className="flex items-center p-2 bg-white rounded-md border border-blue-100">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Risk-Adjusted Returns</h4>
                          <p className="text-xs text-gray-500">Optimize performance</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Link 
                      href="/dashboard/portfolio-optimizer" 
                      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Try Portfolio Optimizer
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="auto-trader" className="space-y-4">
          <TradingAgentPanel />
        </TabsContent>

        <TabsContent value="journal" className="space-y-4">
          <TradeJournal onNavigateToConfig={() => setCurrentTab("auto-trader")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
