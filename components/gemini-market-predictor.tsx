"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Sparkles, BarChart3, AlertTriangle, RefreshCw, Clock, Info } from "lucide-react";
import { MarketTrendPrediction, predictMarketTrend, batchPredictMarketTrends } from '@/lib/gemini-service';

// Sample historical data for demo purposes
const generateMockHistoricalData = (ticker: string, days: number = 30) => {
  const data = [];
  const today = new Date();
  let basePrice = ticker.includes('BTC') ? 3500000 : 
                ticker.includes('ETH') ? 180000 : 
                ticker.includes('RELIANCE') ? 2500 : 1600;
  
  // Add some randomness to the base price
  basePrice = basePrice * (0.9 + Math.random() * 0.2);
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Create some price volatility
    const volatility = 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility * basePrice;
    basePrice += change;
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(basePrice * 100) / 100
    });
  }
  
  return data;
};

// Prediction Card Component
const PredictionCard = ({ prediction }: { prediction: MarketTrendPrediction }) => {
  const predictionColor = 
    prediction.prediction === 'bullish' ? 'text-green-600' :
    prediction.prediction === 'bearish' ? 'text-red-600' : 'text-yellow-600';
  
  const predictionBg = 
    prediction.prediction === 'bullish' ? 'bg-green-50 border-green-200' :
    prediction.prediction === 'bearish' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
  
  const confidenceColor = 
    prediction.confidence > 75 ? 'text-green-600' :
    prediction.confidence > 50 ? 'text-yellow-600' : 'text-red-600';
  
  return (
    <Card className={`${predictionBg} overflow-hidden`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{prediction.asset}</CardTitle>
            <CardDescription>{prediction.ticker} • {prediction.timeFrame} outlook</CardDescription>
          </div>
          <Badge className={`uppercase ${predictionColor} bg-white`}>
            {prediction.prediction === 'bullish' ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : prediction.prediction === 'bearish' ? (
              <TrendingDown className="h-4 w-4 mr-1" />
            ) : null}
            {prediction.prediction}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-sm font-medium">Confidence:</span>
            <Progress value={prediction.confidence} className="w-24 h-2 mx-2" />
            <span className={`text-sm font-medium ${confidenceColor}`}>{prediction.confidence}%</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(prediction.lastUpdated).toLocaleString()}
          </div>
        </div>
        
        {(prediction.supportLevel || prediction.resistanceLevel) && (
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            {prediction.supportLevel && (
              <div className="p-1 bg-green-50 rounded">
                <div className="text-green-600 font-medium">Support</div>
                <div>₹{prediction.supportLevel.toLocaleString()}</div>
              </div>
            )}
            {prediction.resistanceLevel && (
              <div className="p-1 bg-red-50 rounded">
                <div className="text-red-600 font-medium">Resistance</div>
                <div>₹{prediction.resistanceLevel.toLocaleString()}</div>
              </div>
            )}
          </div>
        )}
        
        <div>
          <h4 className="text-sm font-medium mb-1">Key Factors</h4>
          <ul className="text-xs space-y-1">
            {prediction.reasoning.slice(0, 3).map((reason, index) => (
              <li key={index} className="flex items-start">
                <Info className="h-3 w-3 text-blue-500 mr-1 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {prediction.technicalIndicators.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">Technical Indicators</h4>
            <div className="grid grid-cols-2 gap-1">
              {prediction.technicalIndicators.slice(0, 4).map((indicator, index) => (
                <div key={index} className="text-xs p-1 bg-gray-50 rounded">
                  <span className="font-medium">{indicator.name}:</span> {indicator.value}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" className="w-full">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Detailed Analysis
        </Button>
      </CardFooter>
    </Card>
  );
};

// Main Gemini Market Predictor Component
export default function GeminiMarketPredictor() {
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [customAsset, setCustomAsset] = useState<string>('');
  const [customTicker, setCustomTicker] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<string>('1 week');
  const [prediction, setPrediction] = useState<MarketTrendPrediction | null>(null);
  const [batchPredictions, setBatchPredictions] = useState<MarketTrendPrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('single');
  const [error, setError] = useState<string | null>(null);
  
  // Predefined assets
  const predefinedAssets = [
    { name: 'Bitcoin', ticker: 'BTC' },
    { name: 'Ethereum', ticker: 'ETH' },
    { name: 'Reliance Industries', ticker: 'RELIANCE' },
    { name: 'HDFC Bank', ticker: 'HDFCBANK' },
    { name: 'Tata Motors', ticker: 'TATAMOTORS' },
    { name: 'Infosys', ticker: 'INFY' }
  ];
  
  // Get asset details by ticker
  const getAssetByTicker = (ticker: string) => {
    return predefinedAssets.find(asset => asset.ticker === ticker) || { name: '', ticker: '' };
  };
  
  // Handle single asset prediction
  const handlePredictSingle = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let assetName, ticker;
      
      if (selectedAsset === 'custom') {
        if (!customAsset || !customTicker) {
          throw new Error('Please enter both asset name and ticker');
        }
        assetName = customAsset;
        ticker = customTicker;
      } else {
        const asset = getAssetByTicker(selectedAsset);
        assetName = asset.name;
        ticker = asset.ticker;
      }
      
      // Generate mock historical data for demo purposes
      // In a real app, you would fetch this from an API
      const historicalData = generateMockHistoricalData(ticker);
      
      const result = await predictMarketTrend(assetName, ticker, historicalData, timeFrame);
      setPrediction(result);
    } catch (err: any) {
      console.error('Error predicting market trend:', err);
      setError(err.message || 'Failed to generate prediction');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle batch prediction
  const handlePredictBatch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await batchPredictMarketTrends(predefinedAssets, timeFrame);
      setBatchPredictions(results);
    } catch (err: any) {
      console.error('Error batch predicting market trends:', err);
      setError(err.message || 'Failed to generate batch predictions');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate a simple price chart from historical data
  const generatePriceChart = (ticker: string) => {
    const data = generateMockHistoricalData(ticker, 30);
    return data;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-purple-500" />
            Gemini Market Predictor
          </h2>
          <p className="text-gray-500">
            AI-powered market trend predictions using Google's Gemini
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Asset</TabsTrigger>
          <TabsTrigger value="batch">Multiple Assets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predict Market Trend</CardTitle>
              <CardDescription>
                Get AI-powered predictions for a specific asset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset">Select Asset</Label>
                  <Select 
                    value={selectedAsset} 
                    onValueChange={(value) => {
                      setSelectedAsset(value);
                      if (value !== 'custom') {
                        const asset = getAssetByTicker(value);
                        setCustomAsset(asset.name);
                        setCustomTicker(asset.ticker);
                      }
                    }}
                  >
                    <SelectTrigger id="asset">
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedAssets.map((asset) => (
                        <SelectItem key={asset.ticker} value={asset.ticker}>
                          {asset.name} ({asset.ticker})
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom Asset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeframe">Time Frame</Label>
                  <Select value={timeFrame} onValueChange={setTimeFrame}>
                    <SelectTrigger id="timeframe">
                      <SelectValue placeholder="Select time frame" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 day">1 Day</SelectItem>
                      <SelectItem value="1 week">1 Week</SelectItem>
                      <SelectItem value="1 month">1 Month</SelectItem>
                      <SelectItem value="3 months">3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedAsset === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-asset">Asset Name</Label>
                    <Input 
                      id="custom-asset" 
                      value={customAsset} 
                      onChange={(e) => setCustomAsset(e.target.value)} 
                      placeholder="e.g. Apple Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-ticker">Ticker Symbol</Label>
                    <Input 
                      id="custom-ticker" 
                      value={customTicker} 
                      onChange={(e) => setCustomTicker(e.target.value)} 
                      placeholder="e.g. AAPL"
                    />
                  </div>
                </div>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handlePredictSingle} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Prediction...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Prediction
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {prediction && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PredictionCard prediction={prediction} />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historical Price Data</CardTitle>
                  <CardDescription>
                    Last 30 days price movement for {prediction.asset}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={generatePriceChart(prediction.ticker)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                          }}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#8884d8" 
                          name={`${prediction.ticker} Price`}
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Prediction</CardTitle>
              <CardDescription>
                Generate predictions for multiple assets at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-timeframe">Time Frame</Label>
                  <Select value={timeFrame} onValueChange={setTimeFrame}>
                    <SelectTrigger id="batch-timeframe">
                      <SelectValue placeholder="Select time frame" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 day">1 Day</SelectItem>
                      <SelectItem value="1 week">1 Week</SelectItem>
                      <SelectItem value="1 month">1 Month</SelectItem>
                      <SelectItem value="3 months">3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <h3 className="text-sm font-medium mb-2">Assets to Analyze</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {predefinedAssets.map((asset) => (
                      <div key={asset.ticker} className="flex items-center p-2 bg-white rounded-md border border-gray-200">
                        <div className="text-sm">
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-xs text-gray-500">{asset.ticker}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handlePredictBatch} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Predictions...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Batch Predictions
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {batchPredictions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchPredictions.map((prediction, index) => (
                <PredictionCard key={index} prediction={prediction} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="text-xs text-gray-500 mt-4">
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        Disclaimer: These predictions are generated by Google's Gemini AI and should not be considered as financial advice. Always conduct your own research before making investment decisions.
      </div>
    </div>
  );
}
