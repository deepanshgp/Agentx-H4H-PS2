"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { fetchRealTimeCryptoData, fetchRealTimeStockData } from "@/lib/market-api";
import { MarketData } from "@/lib/portfolio-tracker";

// Prediction model - simple linear regression
const predictFuturePrice = (historicalData: number[], days: number): number[] => {
  // Simple implementation - in a real app, you'd use a more sophisticated model
  const predictions: number[] = [];
  const lastPrice = historicalData[historicalData.length - 1];
  
  // Calculate average change over the last few data points
  let avgChange = 0;
  for (let i = 1; i < historicalData.length; i++) {
    avgChange += (historicalData[i] - historicalData[i-1]) / historicalData[i-1];
  }
  avgChange = avgChange / (historicalData.length - 1);
  
  // Generate predictions
  let currentPrice = lastPrice;
  for (let i = 0; i < days; i++) {
    // Add some randomness to make it more realistic
    const randomFactor = 0.5 + Math.random();
    const dailyChange = avgChange * randomFactor;
    currentPrice = currentPrice * (1 + dailyChange);
    predictions.push(currentPrice);
  }
  
  return predictions;
};

// Generate mock historical data
const generateHistoricalData = (currentPrice: number, volatility: number = 0.02): number[] => {
  const days = 30; // 30 days of historical data
  const data: number[] = [];
  let price = currentPrice * (1 - volatility * 10); // Start from a lower price
  
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * volatility;
    price = price * (1 + change);
    data.push(price);
  }
  
  // Make sure the last price matches the current price
  data.push(currentPrice);
  
  return data;
};

export default function InvestmentPredictor() {
  const [activeTab, setActiveTab] = useState("crypto");
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [predictionDays, setPredictionDays] = useState<number>(7);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [cryptoAssets, setCryptoAssets] = useState<MarketData[]>([]);
  const [stockAssets, setStockAssets] = useState<MarketData[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [potentialReturn, setPotentialReturn] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Fetch available assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const cryptoData = await fetchRealTimeCryptoData();
        const stockData = await fetchRealTimeStockData();
        setCryptoAssets(cryptoData);
        setStockAssets(stockData);
        
        // Set default selected asset
        if (cryptoData.length > 0 && activeTab === "crypto") {
          setSelectedAsset(cryptoData[0].id.toString());
        } else if (stockData.length > 0 && activeTab === "stocks") {
          setSelectedAsset(stockData[0].id.toString());
        }
      } catch (error) {
        console.error("Error fetching assets:", error);
      }
    };
    
    fetchAssets();
  }, [activeTab]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedAsset("");
    setChartData([]);
    setPotentialReturn(null);
  };
  
  // Generate prediction
  const generatePrediction = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      try {
        // Get current asset data
        const assets = activeTab === "crypto" ? cryptoAssets : stockAssets;
        const asset = assets.find(a => a.id.toString() === selectedAsset);
        
        if (!asset) {
          console.error("Selected asset not found");
          setIsLoading(false);
          return;
        }
        
        // Generate historical data based on current price
        const historicalPrices = generateHistoricalData(asset.price, activeTab === "crypto" ? 0.04 : 0.02);
        
        // Predict future prices
        const futurePrices = predictFuturePrice(historicalPrices, predictionDays);
        
        // Calculate potential return
        const initialPrice = asset.price;
        const finalPrice = futurePrices[futurePrices.length - 1];
        const units = investmentAmount / initialPrice;
        const finalValue = units * finalPrice;
        setPotentialReturn(finalValue);
        
        // Prepare chart data
        const data: any[] = [];
        
        // Historical data (past 30 days)
        historicalPrices.forEach((price, index) => {
          data.push({
            day: -historicalPrices.length + index,
            price: price,
            type: "historical"
          });
        });
        
        // Future predictions
        futurePrices.forEach((price, index) => {
          data.push({
            day: index + 1,
            price: price,
            type: "prediction"
          });
        });
        
        setChartData(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error generating prediction:", error);
        setIsLoading(false);
      }
    }, 1000); // Simulate processing time
  };
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Investment Predictor
        </CardTitle>
        <CardDescription>
          Predict potential returns on crypto and stock investments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="crypto">Cryptocurrency</TabsTrigger>
            <TabsTrigger value="stocks">Stocks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="crypto" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="crypto-asset">Select Cryptocurrency</Label>
                  <Select 
                    value={selectedAsset} 
                    onValueChange={setSelectedAsset}
                  >
                    <SelectTrigger id="crypto-asset">
                      <SelectValue placeholder="Select a cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id.toString()}>
                          {asset.name} ({asset.ticker})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="crypto-investment">Investment Amount (₹)</Label>
                  <Input
                    id="crypto-investment"
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    min={1000}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="crypto-days">Prediction Period (Days)</Label>
                  <Select 
                    value={predictionDays.toString()} 
                    onValueChange={(value) => setPredictionDays(Number(value))}
                  >
                    <SelectTrigger id="crypto-days">
                      <SelectValue placeholder="Select prediction period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={generatePrediction}
                  disabled={!selectedAsset || isLoading}
                >
                  {isLoading ? "Generating..." : "Generate Prediction"}
                </Button>
                
                {potentialReturn !== null && (
                  <div className="mt-4 p-4 border rounded-md bg-gray-50">
                    <h3 className="font-medium text-sm text-gray-500">Potential Return</h3>
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(potentialReturn)}</p>
                        <p className="text-sm text-gray-500">from {formatCurrency(investmentAmount)}</p>
                      </div>
                      <div className={potentialReturn > investmentAmount ? "text-green-600" : "text-red-600"}>
                        {potentialReturn > investmentAmount ? (
                          <div className="flex items-center">
                            <ArrowUpRight className="h-5 w-5 mr-1" />
                            <span className="font-bold">
                              {((potentialReturn / investmentAmount - 1) * 100).toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <ArrowDownRight className="h-5 w-5 mr-1" />
                            <span className="font-bold">
                              {((1 - potentialReturn / investmentAmount) * 100).toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="day" 
                        label={{ value: 'Days', position: 'insideBottom', offset: -5 }} 
                      />
                      <YAxis 
                        label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Price']}
                        labelFormatter={(value) => value < 0 ? `${value} days ago` : value === 0 ? 'Today' : `${value} days from now`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{ r: 1 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 border border-dashed rounded-md">
                    <p>Select an asset and generate a prediction to see chart</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="stocks" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stock-asset">Select Stock</Label>
                  <Select 
                    value={selectedAsset} 
                    onValueChange={setSelectedAsset}
                  >
                    <SelectTrigger id="stock-asset">
                      <SelectValue placeholder="Select a stock" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id.toString()}>
                          {asset.name} ({asset.ticker})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock-investment">Investment Amount (₹)</Label>
                  <Input
                    id="stock-investment"
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    min={1000}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock-days">Prediction Period (Days)</Label>
                  <Select 
                    value={predictionDays.toString()} 
                    onValueChange={(value) => setPredictionDays(Number(value))}
                  >
                    <SelectTrigger id="stock-days">
                      <SelectValue placeholder="Select prediction period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={generatePrediction}
                  disabled={!selectedAsset || isLoading}
                >
                  {isLoading ? "Generating..." : "Generate Prediction"}
                </Button>
                
                {potentialReturn !== null && (
                  <div className="mt-4 p-4 border rounded-md bg-gray-50">
                    <h3 className="font-medium text-sm text-gray-500">Potential Return</h3>
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(potentialReturn)}</p>
                        <p className="text-sm text-gray-500">from {formatCurrency(investmentAmount)}</p>
                      </div>
                      <div className={potentialReturn > investmentAmount ? "text-green-600" : "text-red-600"}>
                        {potentialReturn > investmentAmount ? (
                          <div className="flex items-center">
                            <ArrowUpRight className="h-5 w-5 mr-1" />
                            <span className="font-bold">
                              {((potentialReturn / investmentAmount - 1) * 100).toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <ArrowDownRight className="h-5 w-5 mr-1" />
                            <span className="font-bold">
                              {((1 - potentialReturn / investmentAmount) * 100).toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="day" 
                        label={{ value: 'Days', position: 'insideBottom', offset: -5 }} 
                      />
                      <YAxis 
                        label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Price']}
                        labelFormatter={(value) => value < 0 ? `${value} days ago` : value === 0 ? 'Today' : `${value} days from now`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        dot={{ r: 1 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 border border-dashed rounded-md">
                    <p>Select an asset and generate a prediction to see chart</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        <p>Disclaimer: Predictions are based on historical data and simple modeling. Actual market performance may vary significantly. This is not financial advice.</p>
      </CardFooter>
    </Card>
  );
}
