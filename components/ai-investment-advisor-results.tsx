"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, TrendingUp, BarChart3, PieChart, Brain, AlertTriangle, ChevronRight, ArrowUpRight, ArrowDownRight, Info, Check, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { RiskProfile, MarketSentiment, InvestmentRecommendation, PortfolioOptimization } from '@/lib/ai-investment-advisor';

// Market Sentiment Visualization Component
const MarketSentimentVisual = ({ sentiment }: { sentiment: MarketSentiment }) => {
  const sentimentColor = 
    sentiment.overallSentiment === 'bullish' ? 'bg-green-500' :
    sentiment.overallSentiment === 'bearish' ? 'bg-red-500' : 'bg-yellow-500';

  const sentimentData = [
    { name: 'News', value: sentiment.sources.news },
    { name: 'Social', value: sentiment.sources.social },
    { name: 'Technical', value: sentiment.sources.technical }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <div className="p-4 border rounded-md space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{sentiment.asset} Market Sentiment</h3>
        <Badge 
          variant="outline" 
          className={`${sentimentColor} text-white`}
        >
          {sentiment.overallSentiment.toUpperCase()}
        </Badge>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`${sentimentColor} h-2.5 rounded-full`} 
            style={{ width: `${Math.abs(sentiment.sentimentScore)}%` }}
          ></div>
        </div>
        <span className="text-sm font-medium">{sentiment.sentimentScore}%</span>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Sentiment Sources</h4>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">Key Factors</h4>
          <div className="space-y-2">
            <div>
              <h5 className="text-xs font-medium text-green-600">Positive</h5>
              <ul className="text-xs list-disc list-inside">
                {sentiment.keywords.positive.map((keyword, index) => (
                  <li key={index}>{keyword}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-medium text-red-600">Negative</h5>
              <ul className="text-xs list-disc list-inside">
                {sentiment.keywords.negative.map((keyword, index) => (
                  <li key={index}>{keyword}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-2">
        Last updated: {sentiment.lastUpdated.toLocaleString()}
      </div>
    </div>
  );
};

// Recommendation Card Component
const RecommendationCard = ({ recommendation }: { recommendation: InvestmentRecommendation }) => {
  const actionColor = 
    recommendation.action === 'buy' ? 'text-green-600' :
    recommendation.action === 'sell' ? 'text-red-600' : 'text-yellow-600';
  
  const actionBg = 
    recommendation.action === 'buy' ? 'bg-green-50 border-green-200' :
    recommendation.action === 'sell' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
  
  const riskColor = 
    recommendation.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
    recommendation.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
  
  return (
    <Card className={`${actionBg} overflow-hidden`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{recommendation.asset}</CardTitle>
            <CardDescription>{recommendation.ticker} • {recommendation.type.toUpperCase()}</CardDescription>
          </div>
          <Badge className={riskColor}>{recommendation.riskLevel.toUpperCase()} RISK</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className={`text-lg font-bold uppercase ${actionColor}`}>{recommendation.action}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">{recommendation.timeHorizon}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm mr-1">Confidence:</span>
            <Progress value={recommendation.confidence} className="w-20 h-2" />
            <span className="text-sm ml-1">{recommendation.confidence}%</span>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-1">Expected Returns</h4>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-1 bg-red-50 rounded">
              <div className="text-red-600 font-medium">Pessimistic</div>
              <div>{recommendation.expectedReturn.pessimistic.toFixed(1)}%</div>
            </div>
            <div className="p-1 bg-blue-50 rounded">
              <div className="text-blue-600 font-medium">Realistic</div>
              <div>{recommendation.expectedReturn.realistic.toFixed(1)}%</div>
            </div>
            <div className="p-1 bg-green-50 rounded">
              <div className="text-green-600 font-medium">Optimistic</div>
              <div>{recommendation.expectedReturn.optimistic.toFixed(1)}%</div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-1">AI Reasoning</h4>
          <ul className="text-xs space-y-1">
            {recommendation.reasoning.slice(0, 3).map((reason, index) => (
              <li key={index} className="flex items-start">
                <Check className="h-3 w-3 text-green-500 mr-1 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" className="w-full">
          <TrendingUp className="h-4 w-4 mr-2" />
          View Detailed Analysis
        </Button>
      </CardFooter>
    </Card>
  );
};

// Portfolio Optimization Component
const PortfolioOptimizationView = ({ optimization }: { optimization: PortfolioOptimization }) => {
  // Prepare data for the allocation comparison chart
  const allAssets = new Set<string>();
  optimization.currentAllocation.forEach(item => allAssets.add(item.asset));
  optimization.recommendedAllocation.forEach(item => allAssets.add(item.asset));
  
  const chartData = Array.from(allAssets).map(asset => {
    const current = optimization.currentAllocation.find(a => a.asset === asset);
    const recommended = optimization.recommendedAllocation.find(a => a.asset === asset);
    
    return {
      name: asset,
      current: current ? current.percentage : 0,
      recommended: recommended ? recommended.percentage : 0,
      change: recommended ? recommended.change : 0
    };
  });
  
  // Sort by absolute change
  chartData.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  // Colors for the chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="mr-2 h-5 w-5" />
          Portfolio Optimization
        </CardTitle>
        <CardDescription>
          AI-recommended changes to optimize your portfolio allocation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-md text-center">
            <h3 className="text-sm font-medium text-gray-500">Risk Reduction</h3>
            <div className="text-2xl font-bold text-green-600">{optimization.expectedImprovements.risk}%</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-md text-center">
            <h3 className="text-sm font-medium text-gray-500">Return Increase</h3>
            <div className="text-2xl font-bold text-blue-600">{optimization.expectedImprovements.return}%</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-md text-center">
            <h3 className="text-sm font-medium text-gray-500">Sharpe Ratio</h3>
            <div className="text-2xl font-bold">+{optimization.expectedImprovements.sharpeRatio.toFixed(2)}</div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2">Allocation Comparison</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Allocation %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="current" stroke="#8884d8" name="Current Allocation" strokeWidth={2} />
                <Line type="monotone" dataKey="recommended" stroke="#82ca9d" name="Recommended Allocation" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2">Major Changes</h3>
          <div className="space-y-2">
            {optimization.recommendedAllocation
              .filter(item => Math.abs(item.change) > 5)
              .map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="font-medium">{item.asset}</span>
                  <div className="flex items-center">
                    <span className="text-sm">{item.percentage.toFixed(1)}%</span>
                    <span className="mx-2 text-gray-400">from</span>
                    <span className="text-sm">
                      {(item.percentage - item.change).toFixed(1)}%
                    </span>
                    {item.change > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 ml-2" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 ml-2" />
                    )}
                    <span className={item.change > 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2">AI Reasoning</h3>
          <ul className="text-sm space-y-1">
            {optimization.reasoning.map((reason, index) => (
              <li key={index} className="flex items-start">
                <Info className="h-4 w-4 text-blue-500 mr-1 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Results Component
const AIInvestmentAdvisorResults = ({
  riskProfile,
  recommendations,
  portfolioOptimization,
  insights,
  onReset
}: {
  riskProfile: RiskProfile;
  recommendations: InvestmentRecommendation[];
  portfolioOptimization: PortfolioOptimization;
  insights: string[];
  onReset: () => void;
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Sparkles className="mr-2 h-6 w-6 text-primary" />
            AI Investment Recommendations
          </h2>
          <p className="text-gray-500">
            Personalized investment advice based on your risk profile and market analysis
          </p>
        </div>
        <Button variant="outline" onClick={onReset}>
          Update Profile
        </Button>
      </div>
      
      <Alert className="bg-blue-50 border-blue-200">
        <Brain className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Your Risk Profile</AlertTitle>
        <AlertDescription className="text-blue-700">
          <span className="font-medium">
            {riskProfile.riskTolerance === 'high' ? 'High Risk Tolerance' : 
             riskProfile.riskTolerance === 'medium' ? 'Moderate Risk Tolerance' : 
             'Conservative Risk Tolerance'}
          </span> • 
          <span>
            {riskProfile.investmentHorizon === 'long' ? 'Long-term Investor' : 
             riskProfile.investmentHorizon === 'medium' ? 'Medium-term Investor' : 
             'Short-term Investor'}
          </span>
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            AI Market Insights
          </CardTitle>
          <CardDescription>
            Natural language analysis of market conditions and investment opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">Top Recommendations</TabsTrigger>
          <TabsTrigger value="sentiment">Market Sentiment</TabsTrigger>
          <TabsTrigger value="optimization">Portfolio Optimization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((recommendation, index) => (
              <RecommendationCard key={index} recommendation={recommendation} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="sentiment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((recommendation, index) => (
              <MarketSentimentVisual key={index} sentiment={recommendation.marketSentiment} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="optimization" className="space-y-4">
          <PortfolioOptimizationView optimization={portfolioOptimization} />
        </TabsContent>
      </Tabs>
      
      <div className="text-xs text-gray-500 mt-4">
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        Disclaimer: These recommendations are generated by an AI model based on your risk profile and market data analysis. They should not be considered as financial advice. Always consult with a qualified financial advisor before making investment decisions.
      </div>
    </div>
  );
};

export default AIInvestmentAdvisorResults;
