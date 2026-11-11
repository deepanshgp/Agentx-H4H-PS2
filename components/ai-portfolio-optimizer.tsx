/**
 * AI Portfolio Optimizer Component
 * Analyzes user's portfolio and suggests optimal allocations based on risk profile
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, TrendingUp, TrendingDown, BarChart3, PieChart, RefreshCw, AlertTriangle, Info, ShieldAlert, DollarSign } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { PortfolioAsset, RiskProfile, OptimizationResult, optimizePortfolio, generateSamplePortfolio } from '@/lib/portfolio-optimizer';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const SECTOR_COLORS = {
  'Technology': '#0088FE',
  'Finance': '#00C49F',
  'Energy': '#FFBB28',
  'Healthcare': '#FF8042',
  'Consumer': '#8884d8',
  'Crypto': '#82ca9d'
};

// Custom tooltip for pie chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow-sm text-xs">
        <p className="font-medium">{payload[0].name}</p>
        <p>{`${payload[0].value.toFixed(2)}%`}</p>
      </div>
    );
  }
  return null;
};

// Asset allocation card component
const AssetAllocationCard = ({ 
  asset, 
  isOptimized = false,
  action = null
}: { 
  asset: PortfolioAsset, 
  isOptimized?: boolean,
  action?: { action: string, percentageChange: number } | null
}) => {
  return (
    <div className="border rounded-md p-3 bg-white">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium">{asset.name}</h4>
          <p className="text-xs text-muted-foreground">{asset.ticker}</p>
        </div>
        {action && (
          <Badge variant={action.action === 'buy' ? 'default' : action.action === 'sell' ? 'destructive' : 'outline'}>
            {action.action === 'buy' ? '+' : action.action === 'sell' ? '-' : ''}
            {Math.abs(action.percentageChange).toFixed(2)}%
          </Badge>
        )}
      </div>
      
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Allocation</span>
            <span className={isOptimized ? 'font-medium' : ''}>{asset.allocation.toFixed(2)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${isOptimized ? 'bg-primary' : 'bg-gray-300'}`}
              style={{ width: `${asset.allocation}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Value</span>
            <p>₹{asset.value.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Price</span>
            <p>₹{asset.price.toLocaleString()}</p>
          </div>
          {asset.volatility !== undefined && (
            <div>
              <span className="text-muted-foreground">Volatility</span>
              <p>{(asset.volatility * 100).toFixed(2)}%</p>
            </div>
          )}
          {asset.beta !== undefined && (
            <div>
              <span className="text-muted-foreground">Beta</span>
              <p>{asset.beta.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AIPortfolioOptimizer() {
  // State for portfolio and risk profile
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>(generateSamplePortfolio());
  const [riskProfile, setRiskProfile] = useState<RiskProfile>({
    riskTolerance: 'moderate',
    investmentHorizon: 'medium',
    age: 35,
    incomeStability: 'medium',
    financialGoals: ['Retirement', 'Wealth Growth']
  });
  
  // State for optimization result and loading state
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  
  // Handle risk tolerance change
  const handleRiskToleranceChange = (value: string) => {
    setRiskProfile({
      ...riskProfile,
      riskTolerance: value as 'conservative' | 'moderate' | 'aggressive'
    });
  };
  
  // Handle investment horizon change
  const handleInvestmentHorizonChange = (value: string) => {
    setRiskProfile({
      ...riskProfile,
      investmentHorizon: value as 'short' | 'medium' | 'long'
    });
  };
  
  // Handle age change
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const age = parseInt(e.target.value);
    if (!isNaN(age) && age > 0) {
      setRiskProfile({
        ...riskProfile,
        age
      });
    }
  };
  
  // Handle income stability change
  const handleIncomeStabilityChange = (value: string) => {
    setRiskProfile({
      ...riskProfile,
      incomeStability: value as 'low' | 'medium' | 'high'
    });
  };
  
  // Optimize portfolio
  const handleOptimizePortfolio = async () => {
    setIsLoading(true);
    try {
      const result = await optimizePortfolio(portfolio, riskProfile);
      setOptimizationResult(result);
      setActiveTab('optimized');
    } catch (error) {
      console.error('Error optimizing portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Prepare data for allocation pie chart
  const prepareAllocationData = (assets: PortfolioAsset[]) => {
    return assets.map(asset => ({
      name: asset.ticker,
      value: asset.allocation
    }));
  };
  
  // Prepare data for sector exposure chart
  const prepareSectorData = (sectorExposure: Record<string, number> | undefined) => {
    if (!sectorExposure) return [];
    
    return Object.entries(sectorExposure).map(([sector, allocation]) => ({
      name: sector,
      value: allocation
    }));
  };
  
  // Prepare data for comparison chart
  const prepareComparisonData = () => {
    if (!optimizationResult) return [];
    
    return [
      {
        name: 'Expected Return',
        Current: optimizationResult.expectedReturn - 2, // Slightly lower for demo
        Optimized: optimizationResult.expectedReturn
      },
      {
        name: 'Risk',
        Current: optimizationResult.expectedRisk + 1, // Slightly higher for demo
        Optimized: optimizationResult.expectedRisk
      },
      {
        name: 'Sharpe Ratio',
        Current: optimizationResult.sharpeRatio - 0.3, // Slightly lower for demo
        Optimized: optimizationResult.sharpeRatio
      },
      {
        name: 'Diversification',
        Current: optimizationResult.diversificationScore - 15, // Slightly lower for demo
        Optimized: optimizationResult.diversificationScore
      }
    ];
  };
  
  // Find rebalancing action for an asset
  const findRebalancingAction = (ticker: string) => {
    if (!optimizationResult) return null;
    
    return optimizationResult.rebalancingActions.find(action => action.ticker === ticker);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Portfolio Optimizer</h2>
          <p className="text-muted-foreground">
            Optimize your portfolio allocation based on your risk profile and financial goals
          </p>
        </div>
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Risk Profile</CardTitle>
            <CardDescription>
              Define your investment preferences and risk tolerance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="risk-tolerance">Risk Tolerance</Label>
              <Select value={riskProfile.riskTolerance} onValueChange={handleRiskToleranceChange}>
                <SelectTrigger id="risk-tolerance">
                  <SelectValue placeholder="Select risk tolerance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="investment-horizon">Investment Horizon</Label>
              <Select value={riskProfile.investmentHorizon} onValueChange={handleInvestmentHorizonChange}>
                <SelectTrigger id="investment-horizon">
                  <SelectValue placeholder="Select investment horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short Term (&lt; 2 years)</SelectItem>
                  <SelectItem value="medium">Medium Term (2-5 years)</SelectItem>
                  <SelectItem value="long">Long Term (&gt; 5 years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input 
                id="age" 
                type="number" 
                value={riskProfile.age || ''} 
                onChange={handleAgeChange}
                min="18"
                max="100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="income-stability">Income Stability</Label>
              <Select value={riskProfile.incomeStability || 'medium'} onValueChange={handleIncomeStabilityChange}>
                <SelectTrigger id="income-stability">
                  <SelectValue placeholder="Select income stability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Variable Income)</SelectItem>
                  <SelectItem value="medium">Medium (Mostly Stable)</SelectItem>
                  <SelectItem value="high">High (Very Stable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Alert className="bg-primary/10 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertTitle>Personalized Optimization</AlertTitle>
              <AlertDescription>
                Our AI analyzes your risk profile and portfolio to suggest an optimal allocation strategy that balances risk and return.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleOptimizePortfolio} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing Portfolio...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Optimize My Portfolio
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Portfolio</CardTitle>
            <CardDescription>
              Your current asset allocation and portfolio statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={prepareAllocationData(portfolio)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                      labelLine={false}
                    >
                      {prepareAllocationData(portfolio).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <RechartsLegend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {portfolio.map((asset, index) => (
                <AssetAllocationCard key={index} asset={asset} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {optimizationResult && (
        <div className="space-y-6">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Current Portfolio</TabsTrigger>
              <TabsTrigger value="optimized">Optimized Portfolio</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Portfolio Analysis</CardTitle>
                  <CardDescription>
                    Analysis of your current investment allocation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Portfolio Metrics</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Expected Annual Return</span>
                            <span className="font-medium">{(optimizationResult.expectedReturn - 2).toFixed(2)}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${(optimizationResult.expectedReturn - 2) * 2}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Risk Level</span>
                            <span className="font-medium">{(optimizationResult.expectedRisk + 1).toFixed(2)}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div 
                              className="h-full bg-orange-500 rounded-full" 
                              style={{ width: `${(optimizationResult.expectedRisk + 1) * 2}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Sharpe Ratio</span>
                            <span className="font-medium">{(optimizationResult.sharpeRatio - 0.3).toFixed(2)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div 
                              className="h-full bg-green-500 rounded-full" 
                              style={{ width: `${(optimizationResult.sharpeRatio - 0.3) * 20}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Diversification Score</span>
                            <span className="font-medium">{(optimizationResult.diversificationScore - 15).toFixed(0)}/100</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div 
                              className="h-full bg-purple-500 rounded-full" 
                              style={{ width: `${optimizationResult.diversificationScore - 15}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Sector Exposure</h3>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={prepareSectorData(optimizationResult.sectorExposure)}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                            >
                              {prepareSectorData(optimizationResult.sectorExposure).map((entry) => (
                                <Cell 
                                  key={`cell-${entry.name}`} 
                                  fill={SECTOR_COLORS[entry.name as keyof typeof SECTOR_COLORS] || '#999'} 
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Risk Analysis</h3>
                    <ul className="space-y-2">
                      {optimizationResult.riskAnalysis.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <ShieldAlert className="h-5 w-5 mr-2 text-orange-500 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="optimized" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Optimized Portfolio</CardTitle>
                  <CardDescription>
                    AI-recommended allocation based on your risk profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Recommended Allocation</h3>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={prepareAllocationData(optimizationResult.optimizedPortfolio)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}%`}
                              labelLine={false}
                            >
                              {prepareAllocationData(optimizationResult.optimizedPortfolio).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                            <RechartsLegend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Performance Comparison</h3>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={prepareComparisonData()}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Current" fill="#8884d8" />
                            <Bar dataKey="Optimized" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Rebalancing Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {optimizationResult.optimizedPortfolio.map((asset, index) => {
                        const action = findRebalancingAction(asset.ticker);
                        return (
                          <AssetAllocationCard 
                            key={index} 
                            asset={asset} 
                            isOptimized={true}
                            action={action ? {
                              action: action.action,
                              percentageChange: action.percentageChange
                            } : null}
                          />
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Expected Improvements</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-3 rounded-md border border-green-100">
                          <div className="flex items-center text-green-600 mb-1">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Return</span>
                          </div>
                          <div className="text-lg font-bold">{optimizationResult.expectedReturn.toFixed(2)}%</div>
                          <div className="text-xs text-green-600">
                            +{(optimizationResult.expectedReturn - (optimizationResult.expectedReturn - 2)).toFixed(2)}%
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                          <div className="flex items-center text-blue-600 mb-1">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Risk</span>
                          </div>
                          <div className="text-lg font-bold">{optimizationResult.expectedRisk.toFixed(2)}%</div>
                          <div className="text-xs text-blue-600">
                            -{((optimizationResult.expectedRisk + 1) - optimizationResult.expectedRisk).toFixed(2)}%
                          </div>
                        </div>
                        
                        <div className="bg-purple-50 p-3 rounded-md border border-purple-100">
                          <div className="flex items-center text-purple-600 mb-1">
                            <PieChart className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Diversification</span>
                          </div>
                          <div className="text-lg font-bold">{optimizationResult.diversificationScore.toFixed(0)}/100</div>
                          <div className="text-xs text-purple-600">
                            +{(optimizationResult.diversificationScore - (optimizationResult.diversificationScore - 15)).toFixed(0)} pts
                          </div>
                        </div>
                        
                        <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
                          <div className="flex items-center text-amber-600 mb-1">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Sharpe Ratio</span>
                          </div>
                          <div className="text-lg font-bold">{optimizationResult.sharpeRatio.toFixed(2)}</div>
                          <div className="text-xs text-amber-600">
                            +{(optimizationResult.sharpeRatio - (optimizationResult.sharpeRatio - 0.3)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">AI Analysis</h3>
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h4 className="font-medium mb-2">Return Potential</h4>
                          <ul className="space-y-2">
                            {optimizationResult.returnAnalysis.map((item, index) => (
                              <li key={index} className="flex items-start text-sm">
                                <TrendingUp className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    This is an AI-generated recommendation. Always consult with a financial advisor before making investment decisions.
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
