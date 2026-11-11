/**
 * AI Portfolio Optimizer Page
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AIPortfolioOptimizer from '@/components/ai-portfolio-optimizer';
import { PieChart } from 'lucide-react';

export default function PortfolioOptimizerPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Portfolio Optimizer</h2>
          <p className="text-muted-foreground">
            Optimize your investment portfolio with AI-powered allocation recommendations
          </p>
        </div>
        <PieChart className="h-10 w-10 text-blue-500" />
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Understand how our AI optimizes your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-center mb-2">
                    <div className="bg-blue-100 p-2 rounded-full mr-2">
                      <span className="font-bold text-blue-600">1</span>
                    </div>
                    <h3 className="font-medium">Define Your Risk Profile</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Tell us about your risk tolerance, investment horizon, and financial goals.
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-center mb-2">
                    <div className="bg-blue-100 p-2 rounded-full mr-2">
                      <span className="font-bold text-blue-600">2</span>
                    </div>
                    <h3 className="font-medium">AI Analysis</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Our AI analyzes your current portfolio and risk profile to identify optimization opportunities.
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-center mb-2">
                    <div className="bg-blue-100 p-2 rounded-full mr-2">
                      <span className="font-bold text-blue-600">3</span>
                    </div>
                    <h3 className="font-medium">Optimized Allocation</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Receive a personalized allocation strategy that balances risk and return based on your preferences.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-medium mb-2">Key Benefits</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>Improved diversification across assets and sectors</li>
                  <li>Better risk-adjusted returns</li>
                  <li>Personalized to your specific risk tolerance</li>
                  <li>Clear rebalancing actions with reasoning</li>
                  <li>AI-powered analysis of return potential and risk factors</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <AIPortfolioOptimizer />
      </div>
    </div>
  );
}
