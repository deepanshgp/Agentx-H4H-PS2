/**
 * AI Portfolio Optimizer Service
 * Uses Gemini AI to analyze and optimize investment portfolios
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { API_KEYS } from '@/config/api-keys';

// Initialize the Gemini API
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || API_KEYS.GEMINI;
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = 'gemini-1.5-pro';

// Types for portfolio optimization
export interface PortfolioAsset {
  name: string;
  ticker: string;
  allocation: number; // Current allocation percentage (0-100)
  price: number;
  quantity: number;
  value: number;
  historicalReturns?: number[]; // Historical returns in percentage
  volatility?: number; // Standard deviation of returns
  beta?: number; // Market correlation coefficient
}

export interface RiskProfile {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentHorizon: 'short' | 'medium' | 'long';
  age?: number;
  incomeStability?: 'low' | 'medium' | 'high';
  financialGoals?: string[];
}

export interface OptimizationResult {
  originalPortfolio: PortfolioAsset[];
  optimizedPortfolio: PortfolioAsset[];
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  rebalancingActions: RebalancingAction[];
  diversificationScore: number; // 0-100
  sectorExposure: Record<string, number>;
  riskAnalysis: string[];
  returnAnalysis: string[];
  timestamp: Date;
}

export interface RebalancingAction {
  ticker: string;
  action: 'buy' | 'sell' | 'hold';
  fromAllocation: number;
  toAllocation: number;
  percentageChange: number;
  reasoning: string;
}

/**
 * Calculate portfolio statistics
 * @param portfolio Array of portfolio assets
 * @returns Object with portfolio statistics
 */
export function calculatePortfolioStats(portfolio: PortfolioAsset[]) {
  // Calculate total portfolio value
  const totalValue = portfolio.reduce((sum, asset) => sum + asset.value, 0);
  
  // Calculate weighted average volatility (risk)
  const weightedVolatility = portfolio.reduce((sum, asset) => {
    const weight = asset.value / totalValue;
    return sum + (asset.volatility || 0) * weight;
  }, 0);
  
  // Calculate weighted average beta
  const weightedBeta = portfolio.reduce((sum, asset) => {
    const weight = asset.value / totalValue;
    return sum + (asset.beta || 1) * weight;
  }, 0);
  
  // Calculate sector exposure
  const sectorExposure: Record<string, number> = {};
  // This would normally use real sector data
  // For demo purposes, we'll use a simplified approach
  
  return {
    totalValue,
    weightedVolatility,
    weightedBeta,
    sectorExposure
  };
}

/**
 * Generate mock historical data for demo purposes
 * @param ticker Asset ticker symbol
 * @returns Object with volatility and beta
 */
function generateMockAssetStats(ticker: string) {
  // In a real app, this would fetch actual historical data
  // For demo purposes, we'll generate reasonable values
  
  // Different asset classes have different risk/return profiles
  let baseVolatility = 0;
  let baseBeta = 0;
  
  if (ticker.includes('BTC') || ticker.includes('ETH')) {
    // Cryptocurrencies - high volatility
    baseVolatility = 0.4 + Math.random() * 0.3; // 40-70%
    baseBeta = 1.5 + Math.random() * 1.0; // 1.5-2.5
  } else if (ticker.includes('RELIANCE') || ticker.includes('TATAMOTORS')) {
    // Growth stocks - medium-high volatility
    baseVolatility = 0.25 + Math.random() * 0.15; // 25-40%
    baseBeta = 1.1 + Math.random() * 0.4; // 1.1-1.5
  } else if (ticker.includes('HDFCBANK') || ticker.includes('INFY')) {
    // Blue chip stocks - medium volatility
    baseVolatility = 0.15 + Math.random() * 0.1; // 15-25%
    baseBeta = 0.8 + Math.random() * 0.3; // 0.8-1.1
  } else {
    // Default - medium volatility
    baseVolatility = 0.2 + Math.random() * 0.1; // 20-30%
    baseBeta = 1.0 + Math.random() * 0.2; // 1.0-1.2
  }
  
  return {
    volatility: baseVolatility,
    beta: baseBeta
  };
}

/**
 * Enrich portfolio with additional statistics
 * @param portfolio Array of portfolio assets
 * @returns Enriched portfolio with volatility and beta
 */
export function enrichPortfolioData(portfolio: PortfolioAsset[]): PortfolioAsset[] {
  return portfolio.map(asset => {
    const stats = generateMockAssetStats(asset.ticker);
    return {
      ...asset,
      volatility: stats.volatility,
      beta: stats.beta
    };
  });
}

/**
 * Optimize a portfolio based on user's risk profile
 * @param portfolio Current portfolio assets
 * @param riskProfile User's risk profile
 * @returns Promise with optimization result
 */
export async function optimizePortfolio(
  portfolio: PortfolioAsset[],
  riskProfile: RiskProfile
): Promise<OptimizationResult> {
  try {
    // Enrich portfolio data with statistics
    const enrichedPortfolio = enrichPortfolioData(portfolio);
    
    // Calculate current portfolio statistics
    const portfolioStats = calculatePortfolioStats(enrichedPortfolio);
    
    // Create a prompt for Gemini
    const prompt = `
    You are an expert financial advisor specializing in portfolio optimization.
    Analyze the following portfolio and suggest an optimized allocation based on the user's risk profile.
    
    Current Portfolio:
    ${enrichedPortfolio.map(asset => (
      `${asset.name} (${asset.ticker}):
       - Current Allocation: ${asset.allocation.toFixed(2)}%
       - Current Value: ₹${asset.value.toLocaleString()}
       - Volatility: ${(asset.volatility! * 100).toFixed(2)}%
       - Beta: ${asset.beta!.toFixed(2)}`
    )).join('\n\n')}
    
    Total Portfolio Value: ₹${portfolioStats.totalValue.toLocaleString()}
    Portfolio Volatility: ${(portfolioStats.weightedVolatility * 100).toFixed(2)}%
    Portfolio Beta: ${portfolioStats.weightedBeta.toFixed(2)}
    
    User Risk Profile:
    - Risk Tolerance: ${riskProfile.riskTolerance}
    - Investment Horizon: ${riskProfile.investmentHorizon}
    ${riskProfile.age ? `- Age: ${riskProfile.age}` : ''}
    ${riskProfile.incomeStability ? `- Income Stability: ${riskProfile.incomeStability}` : ''}
    ${riskProfile.financialGoals ? `- Financial Goals: ${riskProfile.financialGoals.join(', ')}` : ''}
    
    Please provide an optimized portfolio allocation that:
    1. Matches the user's risk profile
    2. Improves diversification
    3. Aims to enhance risk-adjusted returns
    4. Provides specific rebalancing actions
    
    Respond with a JSON object in the following format:
    {
      "optimizedPortfolio": [
        {
          "ticker": "string",
          "allocation": number
        }
      ],
      "expectedReturn": number,
      "expectedRisk": number,
      "sharpeRatio": number,
      "rebalancingActions": [
        {
          "ticker": "string",
          "action": "buy" | "sell" | "hold",
          "fromAllocation": number,
          "toAllocation": number,
          "percentageChange": number,
          "reasoning": "string"
        }
      ],
      "diversificationScore": number,
      "riskAnalysis": ["string"],
      "returnAnalysis": ["string"]
    }
    `;
    
    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Generate the response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/) || 
                        text.match(/({[\s\S]+})/); 
      
      const jsonString = jsonMatch ? jsonMatch[1] : text;
      parsedResponse = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw new Error('Failed to parse optimization response');
    }
    
    // Map the optimized allocations back to the full asset objects
    const optimizedPortfolio = enrichedPortfolio.map(asset => {
      const optimizedAsset = parsedResponse.optimizedPortfolio.find(
        (item: any) => item.ticker === asset.ticker
      );
      
      return {
        ...asset,
        allocation: optimizedAsset ? optimizedAsset.allocation : asset.allocation
      };
    });
    
    // Create sector exposure data
    // In a real app, this would be based on actual sector classifications
    const sectorExposure: Record<string, number> = {
      'Technology': 0,
      'Finance': 0,
      'Energy': 0,
      'Healthcare': 0,
      'Consumer': 0,
      'Crypto': 0
    };
    
    // Simple mapping for demo purposes
    optimizedPortfolio.forEach(asset => {
      if (asset.ticker.includes('BTC') || asset.ticker.includes('ETH')) {
        sectorExposure['Crypto'] += asset.allocation;
      } else if (asset.ticker.includes('HDFCBANK')) {
        sectorExposure['Finance'] += asset.allocation;
      } else if (asset.ticker.includes('RELIANCE')) {
        sectorExposure['Energy'] += asset.allocation;
      } else if (asset.ticker.includes('INFY')) {
        sectorExposure['Technology'] += asset.allocation;
      } else if (asset.ticker.includes('TATAMOTORS')) {
        sectorExposure['Consumer'] += asset.allocation;
      } else {
        // Distribute remaining allocations
        sectorExposure['Technology'] += asset.allocation * 0.2;
        sectorExposure['Finance'] += asset.allocation * 0.2;
        sectorExposure['Energy'] += asset.allocation * 0.2;
        sectorExposure['Healthcare'] += asset.allocation * 0.2;
        sectorExposure['Consumer'] += asset.allocation * 0.2;
      }
    });
    
    // Create the final optimization result
    return {
      originalPortfolio: enrichedPortfolio,
      optimizedPortfolio,
      expectedReturn: parsedResponse.expectedReturn,
      expectedRisk: parsedResponse.expectedRisk,
      sharpeRatio: parsedResponse.sharpeRatio,
      rebalancingActions: parsedResponse.rebalancingActions,
      diversificationScore: parsedResponse.diversificationScore,
      sectorExposure,
      riskAnalysis: parsedResponse.riskAnalysis,
      returnAnalysis: parsedResponse.returnAnalysis,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error optimizing portfolio with Gemini:', error);
    throw error;
  }
}

/**
 * Generate a sample portfolio for demo purposes
 * @returns Sample portfolio with assets
 */
export function generateSamplePortfolio(): PortfolioAsset[] {
  return [
    {
      name: 'Bitcoin',
      ticker: 'BTC',
      allocation: 25,
      price: 3500000,
      quantity: 0.05,
      value: 175000
    },
    {
      name: 'Ethereum',
      ticker: 'ETH',
      allocation: 15,
      price: 180000,
      quantity: 0.6,
      value: 108000
    },
    {
      name: 'Reliance Industries',
      ticker: 'RELIANCE',
      allocation: 20,
      price: 2500,
      quantity: 60,
      value: 150000
    },
    {
      name: 'HDFC Bank',
      ticker: 'HDFCBANK',
      allocation: 15,
      price: 1600,
      quantity: 70,
      value: 112000
    },
    {
      name: 'Tata Motors',
      ticker: 'TATAMOTORS',
      allocation: 15,
      price: 800,
      quantity: 140,
      value: 112000
    },
    {
      name: 'Infosys',
      ticker: 'INFY',
      allocation: 10,
      price: 1400,
      quantity: 50,
      value: 70000
    }
  ];
}
