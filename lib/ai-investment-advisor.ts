// AI Investment Advisor - Advanced recommendation engine using NLP and ML techniques
import { MarketData } from './portfolio-tracker';
import { fetchRealTimeCryptoData, fetchRealTimeStockData } from './market-api';

// Interface for user risk profile
export interface RiskProfile {
  riskTolerance: 'low' | 'medium' | 'high';
  investmentHorizon: 'short' | 'medium' | 'long';
  financialGoals: string[];
  preferredSectors?: string[];
  excludedSectors?: string[];
  monthlyInvestmentCapacity?: number;
}

// Interface for market sentiment analysis
export interface MarketSentiment {
  asset: string;
  ticker: string;
  overallSentiment: 'bearish' | 'neutral' | 'bullish';
  sentimentScore: number; // -100 to 100
  confidence: number; // 0 to 100
  sources: {
    news: number; // sentiment from news articles
    social: number; // sentiment from social media
    technical: number; // sentiment from technical indicators
  };
  keywords: {
    positive: string[];
    negative: string[];
  };
  lastUpdated: Date;
}

// Interface for investment recommendation
export interface InvestmentRecommendation {
  asset: string;
  ticker: string;
  type: 'crypto' | 'stock';
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0 to 100
  targetAllocation: number; // percentage
  expectedReturn: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  timeHorizon: string;
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
  marketSentiment: MarketSentiment;
}

// Interface for portfolio optimization recommendation
export interface PortfolioOptimization {
  currentAllocation: {
    asset: string;
    percentage: number;
  }[];
  recommendedAllocation: {
    asset: string;
    percentage: number;
    change: number; // positive or negative percentage change
  }[];
  expectedImprovements: {
    risk: number; // percentage reduction in risk
    return: number; // percentage increase in expected return
    sharpeRatio: number; // improvement in risk-adjusted return
  };
  reasoning: string[];
}

// Mock data for market sentiment analysis (in a real app, this would come from an API)
const mockMarketSentiments: { [key: string]: MarketSentiment } = {
  'BTC': {
    asset: 'Bitcoin',
    ticker: 'BTC',
    overallSentiment: 'bullish',
    sentimentScore: 68,
    confidence: 82,
    sources: {
      news: 72,
      social: 65,
      technical: 68
    },
    keywords: {
      positive: ['institutional adoption', 'ETF approval', 'inflation hedge'],
      negative: ['regulatory concerns', 'energy consumption']
    },
    lastUpdated: new Date()
  },
  'ETH': {
    asset: 'Ethereum',
    ticker: 'ETH',
    overallSentiment: 'bullish',
    sentimentScore: 72,
    confidence: 78,
    sources: {
      news: 75,
      social: 70,
      technical: 70
    },
    keywords: {
      positive: ['ETH 2.0', 'DeFi growth', 'NFT market'],
      negative: ['gas fees', 'scalability challenges']
    },
    lastUpdated: new Date()
  },
  'RELIANCE': {
    asset: 'Reliance Industries',
    ticker: 'RELIANCE',
    overallSentiment: 'bullish',
    sentimentScore: 65,
    confidence: 80,
    sources: {
      news: 68,
      social: 60,
      technical: 67
    },
    keywords: {
      positive: ['digital expansion', 'retail growth', 'green energy investments'],
      negative: ['oil price volatility', 'high capex']
    },
    lastUpdated: new Date()
  },
  'HDFCBANK': {
    asset: 'HDFC Bank',
    ticker: 'HDFCBANK',
    overallSentiment: 'neutral',
    sentimentScore: 52,
    confidence: 75,
    sources: {
      news: 55,
      social: 48,
      technical: 53
    },
    keywords: {
      positive: ['loan growth', 'digital banking', 'merger synergies'],
      negative: ['NPA concerns', 'regulatory scrutiny']
    },
    lastUpdated: new Date()
  }
};

// Function to analyze user's risk profile
export function analyzeRiskProfile(answers: Record<string, any>): RiskProfile {
  // Calculate risk tolerance based on answers
  let riskScore = 0;
  
  // Age factor - younger can take more risk
  if (answers.age < 30) riskScore += 3;
  else if (answers.age < 45) riskScore += 2;
  else if (answers.age < 60) riskScore += 1;
  
  // Income stability
  if (answers.incomeStability === 'very stable') riskScore += 2;
  else if (answers.incomeStability === 'stable') riskScore += 1;
  
  // Investment experience
  if (answers.investmentExperience === 'experienced') riskScore += 3;
  else if (answers.investmentExperience === 'intermediate') riskScore += 2;
  else riskScore += 1;
  
  // Risk attitude question
  if (answers.riskAttitude === 'aggressive') riskScore += 3;
  else if (answers.riskAttitude === 'moderate') riskScore += 2;
  else riskScore += 1;
  
  // Determine risk tolerance based on score
  let riskTolerance: 'low' | 'medium' | 'high' = 'medium';
  if (riskScore <= 5) riskTolerance = 'low';
  else if (riskScore <= 9) riskTolerance = 'medium';
  else riskTolerance = 'high';
  
  // Determine investment horizon
  let investmentHorizon: 'short' | 'medium' | 'long' = 'medium';
  if (answers.timeHorizon === 'less than 2 years') investmentHorizon = 'short';
  else if (answers.timeHorizon === '2-5 years') investmentHorizon = 'medium';
  else investmentHorizon = 'long';
  
  // Extract financial goals
  const financialGoals = answers.financialGoals || [];
  
  // Extract preferred and excluded sectors
  const preferredSectors = answers.preferredSectors || [];
  const excludedSectors = answers.excludedSectors || [];
  
  // Monthly investment capacity
  const monthlyInvestmentCapacity = answers.monthlyInvestment || 0;
  
  return {
    riskTolerance,
    investmentHorizon,
    financialGoals,
    preferredSectors,
    excludedSectors,
    monthlyInvestmentCapacity
  };
}

// Function to get market sentiment for an asset
export function getMarketSentiment(ticker: string): MarketSentiment {
  // In a real app, this would call an external API or use a machine learning model
  // For this demo, we'll use mock data
  if (mockMarketSentiments[ticker]) {
    return mockMarketSentiments[ticker];
  }
  
  // If we don't have sentiment data for this ticker, generate a random one
  const sentimentOptions: Array<'bearish' | 'neutral' | 'bullish'> = ['bearish', 'neutral', 'bullish'];
  const randomSentiment = sentimentOptions[Math.floor(Math.random() * 3)];
  const randomScore = randomSentiment === 'bearish' ? -50 - Math.random() * 50 :
                      randomSentiment === 'neutral' ? -25 + Math.random() * 50 :
                      50 + Math.random() * 50;
  
  return {
    asset: ticker,
    ticker: ticker,
    overallSentiment: randomSentiment,
    sentimentScore: Math.round(randomScore),
    confidence: Math.round(50 + Math.random() * 30),
    sources: {
      news: Math.round(40 + Math.random() * 60),
      social: Math.round(40 + Math.random() * 60),
      technical: Math.round(40 + Math.random() * 60)
    },
    keywords: {
      positive: ['growth potential', 'innovation', 'market leader'],
      negative: ['competition', 'market volatility', 'regulatory risks']
    },
    lastUpdated: new Date()
  };
}

// Function to generate personalized investment recommendations
export async function generateInvestmentRecommendations(
  riskProfile: RiskProfile,
  currentPortfolio: any[] = []
): Promise<InvestmentRecommendation[]> {
  // Fetch real-time market data
  const cryptoData = await fetchRealTimeCryptoData();
  const stockData = await fetchRealTimeStockData();
  
  // Combine all assets
  const allAssets = [...cryptoData, ...stockData];
  
  // Filter assets based on user preferences
  let filteredAssets = allAssets;
  
  // Filter by preferred sectors if specified
  if (riskProfile.preferredSectors && riskProfile.preferredSectors.length > 0) {
    // In a real app, you would have sector information for each asset
    // For this demo, we'll just use a subset of the assets
    filteredAssets = filteredAssets.slice(0, 10);
  }
  
  // Remove excluded sectors if specified
  if (riskProfile.excludedSectors && riskProfile.excludedSectors.length > 0) {
    // In a real app, you would filter out assets in excluded sectors
    // For this demo, we'll just remove a few assets
    filteredAssets = filteredAssets.filter((_, index) => index % 3 !== 0);
  }
  
  // Sort assets by potential fit for the user's risk profile
  const scoredAssets = filteredAssets.map(asset => {
    // Get market sentiment
    const sentiment = getMarketSentiment(asset.ticker);
    
    // Calculate a score based on risk profile and sentiment
    let score = 0;
    
    // Risk tolerance factor
    if (riskProfile.riskTolerance === 'high') {
      // High risk tolerance - higher sentiment score is better
      score += sentiment.sentimentScore * 0.5;
    } else if (riskProfile.riskTolerance === 'medium') {
      // Medium risk tolerance - moderate sentiment is better
      score += (100 - Math.abs(sentiment.sentimentScore - 50)) * 0.3;
    } else {
      // Low risk tolerance - lower volatility is better
      score += (50 - Math.abs(sentiment.sentimentScore)) * 0.5;
    }
    
    // Investment horizon factor
    if (riskProfile.investmentHorizon === 'long') {
      // Long-term - fundamentals matter more
      score += sentiment.sources.technical * 0.3;
    } else if (riskProfile.investmentHorizon === 'medium') {
      // Medium-term - balanced approach
      score += sentiment.sources.news * 0.2;
    } else {
      // Short-term - social sentiment matters more
      score += sentiment.sources.social * 0.3;
    }
    
    // Current portfolio diversification factor
    const isInPortfolio = currentPortfolio.some(item => item.ticker === asset.ticker);
    if (!isInPortfolio) {
      // Bonus for diversification
      score += 10;
    }
    
    return {
      asset,
      sentiment,
      score
    };
  });
  
  // Sort by score (descending)
  scoredAssets.sort((a, b) => b.score - a.score);
  
  // Take top recommendations based on risk profile
  const numRecommendations = riskProfile.riskTolerance === 'high' ? 5 : 
                             riskProfile.riskTolerance === 'medium' ? 4 : 3;
  
  // Generate recommendations
  const recommendations: InvestmentRecommendation[] = scoredAssets
    .slice(0, numRecommendations)
    .map(({ asset, sentiment }) => {
      // Determine action based on sentiment
      const action: 'buy' | 'sell' | 'hold' = 
        sentiment.overallSentiment === 'bullish' ? 'buy' :
        sentiment.overallSentiment === 'bearish' ? 'sell' : 'hold';
      
      // Determine confidence based on sentiment confidence
      const confidence = sentiment.confidence;
      
      // Calculate target allocation based on risk profile
      const baseAllocation = 100 / numRecommendations;
      let targetAllocation = baseAllocation;
      if (sentiment.overallSentiment === 'bullish') {
        targetAllocation += 5;
      } else if (sentiment.overallSentiment === 'bearish') {
        targetAllocation -= 5;
      }
      
      // Adjust for risk profile
      if (riskProfile.riskTolerance === 'high') {
        targetAllocation *= 1.2;
      } else if (riskProfile.riskTolerance === 'low') {
        targetAllocation *= 0.8;
      }
      
      // Expected returns based on sentiment and risk profile
      const baseReturn = sentiment.sentimentScore / 10; // Convert -100 to 100 scale to -10 to 10 percentage
      const expectedReturn = {
        optimistic: baseReturn + (riskProfile.riskTolerance === 'high' ? 8 : 4),
        realistic: baseReturn,
        pessimistic: baseReturn - (riskProfile.riskTolerance === 'high' ? 12 : 6)
      };
      
      // Time horizon based on user's investment horizon
      const timeHorizon = 
        riskProfile.investmentHorizon === 'short' ? '3-6 months' :
        riskProfile.investmentHorizon === 'medium' ? '1-2 years' : '3-5 years';
      
      // Generate reasoning based on sentiment keywords and risk profile
      const reasoning: string[] = [];
      
      if (action === 'buy') {
        reasoning.push(`Strong ${sentiment.overallSentiment} sentiment with ${sentiment.confidence}% confidence.`);
        reasoning.push(`News sentiment is ${sentiment.sources.news > 60 ? 'positive' : 'neutral'}.`);
        
        // Add positive keywords as reasons
        sentiment.keywords.positive.forEach(keyword => {
          reasoning.push(`Positive factor: ${keyword}.`);
        });
        
        // Add risk profile specific reasoning
        if (riskProfile.riskTolerance === 'high') {
          reasoning.push('Aligns with your high risk tolerance for potential higher returns.');
        } else if (riskProfile.riskTolerance === 'medium') {
          reasoning.push('Balanced risk-reward profile suitable for your moderate risk tolerance.');
        } else {
          reasoning.push('Conservative position with limited downside risk.');
        }
      } else if (action === 'sell') {
        reasoning.push(`${sentiment.overallSentiment} sentiment with ${sentiment.confidence}% confidence suggests caution.`);
        
        // Add negative keywords as reasons
        sentiment.keywords.negative.forEach(keyword => {
          reasoning.push(`Concern: ${keyword}.`);
        });
        
        reasoning.push('Consider reducing exposure to limit potential downside.');
      } else {
        reasoning.push(`${sentiment.overallSentiment} sentiment suggests monitoring the position.`);
        reasoning.push('Technical indicators show mixed signals.');
        reasoning.push('Wait for clearer market direction before adjusting position.');
      }
      
      // Determine risk level based on asset type and sentiment volatility
      const isHighVolatilityAsset = asset.ticker.includes('BTC') || asset.ticker.includes('ETH');
      const riskLevel: 'low' | 'medium' | 'high' = 
        isHighVolatilityAsset ? 'high' :
        Math.abs(sentiment.sentimentScore) > 70 ? 'high' :
        Math.abs(sentiment.sentimentScore) > 40 ? 'medium' : 'low';
      
      return {
        asset: asset.name,
        ticker: asset.ticker,
        type: asset.ticker.length <= 5 ? 'crypto' : 'stock', // Simple heuristic
        action,
        confidence,
        targetAllocation,
        expectedReturn,
        timeHorizon,
        reasoning,
        riskLevel,
        marketSentiment: sentiment
      };
    });
  
  return recommendations;
}

// Function to optimize portfolio allocation
export function optimizePortfolio(
  currentPortfolio: any[],
  recommendations: InvestmentRecommendation[],
  riskProfile: RiskProfile
): PortfolioOptimization {
  // Calculate current allocation
  const totalValue = currentPortfolio.reduce((sum, item) => sum + item.totalValue, 0);
  const currentAllocation = currentPortfolio.map(item => ({
    asset: item.name,
    percentage: (item.totalValue / totalValue) * 100
  }));
  
  // Create recommended allocation based on current portfolio and new recommendations
  const recommendedAllocation: {
    asset: string;
    percentage: number;
    change: number;
  }[] = [];
  
  // First, include all current assets with reduced allocations
  currentPortfolio.forEach(item => {
    const matchingRecommendation = recommendations.find(rec => rec.ticker === item.ticker);
    const recommendedPercentage = matchingRecommendation ? 
      matchingRecommendation.targetAllocation :
      (item.totalValue / totalValue) * 70; // Reduce allocation for non-recommended assets
    
    const currentPercentage = (item.totalValue / totalValue) * 100;
    
    recommendedAllocation.push({
      asset: item.name,
      percentage: recommendedPercentage,
      change: recommendedPercentage - currentPercentage
    });
  });
  
  // Then, add new recommended assets that aren't in the current portfolio
  recommendations.forEach(rec => {
    const isInCurrentPortfolio = currentPortfolio.some(item => item.ticker === rec.ticker);
    if (!isInCurrentPortfolio) {
      recommendedAllocation.push({
        asset: rec.asset,
        percentage: rec.targetAllocation,
        change: rec.targetAllocation // 100% increase since it's new
      });
    }
  });
  
  // Normalize percentages to ensure they sum to 100%
  const totalPercentage = recommendedAllocation.reduce((sum, item) => sum + item.percentage, 0);
  recommendedAllocation.forEach(item => {
    item.percentage = (item.percentage / totalPercentage) * 100;
    // Recalculate change
    const currentItem = currentAllocation.find(current => current.asset === item.asset);
    item.change = currentItem ? item.percentage - currentItem.percentage : item.percentage;
  });
  
  // Sort by absolute change (descending)
  recommendedAllocation.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  // Calculate expected improvements
  // In a real app, this would use more sophisticated portfolio theory calculations
  const expectedImprovements = {
    risk: riskProfile.riskTolerance === 'low' ? 15 : riskProfile.riskTolerance === 'medium' ? 10 : 5,
    return: riskProfile.riskTolerance === 'high' ? 12 : riskProfile.riskTolerance === 'medium' ? 8 : 4,
    sharpeRatio: 0.3 // Improvement in risk-adjusted return
  };
  
  // Generate reasoning
  const reasoning: string[] = [
    'Portfolio optimized based on your risk profile and market conditions.',
    `Diversification improved across ${recommendedAllocation.length} assets.`,
    'Allocation adjusted to align with your investment horizon and financial goals.'
  ];
  
  // Add specific reasoning based on major allocation changes
  const majorIncreases = recommendedAllocation
    .filter(item => item.change > 5)
    .map(item => `Increased allocation to ${item.asset} by ${item.change.toFixed(1)}% to capture growth potential.`);
  
  const majorDecreases = recommendedAllocation
    .filter(item => item.change < -5)
    .map(item => `Reduced exposure to ${item.asset} by ${Math.abs(item.change).toFixed(1)}% to mitigate risk.`);
  
  reasoning.push(...majorIncreases, ...majorDecreases);
  
  return {
    currentAllocation,
    recommendedAllocation,
    expectedImprovements,
    reasoning
  };
}

// Function to generate natural language insights from recommendations
export function generateNaturalLanguageInsights(
  recommendations: InvestmentRecommendation[],
  riskProfile: RiskProfile
): string[] {
  const insights: string[] = [];
  
  // Overall market sentiment
  const overallSentiment = recommendations.reduce(
    (sum, rec) => sum + rec.marketSentiment.sentimentScore, 0
  ) / recommendations.length;
  
  const sentimentDescription = 
    overallSentiment > 60 ? 'very positive' :
    overallSentiment > 30 ? 'positive' :
    overallSentiment > 0 ? 'slightly positive' :
    overallSentiment > -30 ? 'slightly negative' :
    overallSentiment > -60 ? 'negative' : 'very negative';
  
  insights.push(`Overall market sentiment for your recommended portfolio is ${sentimentDescription}.`);
  
  // Top recommendation highlight
  if (recommendations.length > 0) {
    const topRec = recommendations[0];
    insights.push(
      `Our top recommendation is ${topRec.action === 'buy' ? 'to invest in' : topRec.action === 'sell' ? 'to reduce exposure to' : 'to hold'} ${topRec.asset} (${topRec.ticker}) with ${topRec.confidence}% confidence.`
    );
    
    // Add reasoning for top recommendation
    insights.push(`Key factors: ${topRec.reasoning.slice(0, 2).join(' ')}`);
  }
  
  // Risk profile specific insights
  if (riskProfile.riskTolerance === 'high') {
    insights.push('Your high risk tolerance allows for more aggressive positions in volatile assets with higher growth potential.');
    
    // Find highest expected return
    const highestReturnRec = recommendations.reduce(
      (highest, rec) => rec.expectedReturn.optimistic > highest.expectedReturn.optimistic ? rec : highest,
      recommendations[0]
    );
    
    insights.push(`${highestReturnRec.asset} has the highest potential upside in the optimistic scenario with a projected ${highestReturnRec.expectedReturn.optimistic.toFixed(1)}% return.`);
  } else if (riskProfile.riskTolerance === 'medium') {
    insights.push('Your balanced risk approach suggests a mix of stable assets and moderate growth opportunities.');
    
    // Find most balanced risk-reward recommendation
    const balancedRec = recommendations.reduce(
      (most, rec) => {
        const riskRewardRatio = rec.expectedReturn.realistic / (rec.riskLevel === 'high' ? 3 : rec.riskLevel === 'medium' ? 2 : 1);
        const mostRatio = most.expectedReturn.realistic / (most.riskLevel === 'high' ? 3 : most.riskLevel === 'medium' ? 2 : 1);
        return riskRewardRatio > mostRatio ? rec : most;
      },
      recommendations[0]
    );
    
    insights.push(`${balancedRec.asset} offers the best balance of risk and reward with a realistic return projection of ${balancedRec.expectedReturn.realistic.toFixed(1)}%.`);
  } else {
    insights.push('Your conservative risk profile suggests focusing on capital preservation with stable, lower-volatility assets.');
    
    // Find lowest risk recommendation
    const lowestRiskRec = recommendations.find(rec => rec.riskLevel === 'low') || recommendations[0];
    
    insights.push(`${lowestRiskRec.asset} offers a lower-risk option with a realistic return projection of ${lowestRiskRec.expectedReturn.realistic.toFixed(1)}%.`);
  }
  
  // Time horizon specific insights
  if (riskProfile.investmentHorizon === 'long') {
    insights.push('Your long-term investment horizon allows you to weather short-term market volatility for potentially higher long-term gains.');
  } else if (riskProfile.investmentHorizon === 'medium') {
    insights.push('With a medium-term horizon, consider rebalancing your portfolio every 6-12 months to adjust to changing market conditions.');
  } else {
    insights.push('Your short-term investment horizon suggests more frequent portfolio reviews and a focus on liquidity and capital preservation.');
  }
  
  // Diversification insight
  const cryptoCount = recommendations.filter(rec => rec.type === 'crypto').length;
  const stockCount = recommendations.filter(rec => rec.type === 'stock').length;
  
  if (cryptoCount > 0 && stockCount > 0) {
    insights.push(`Your recommended portfolio is diversified across both traditional stocks (${stockCount}) and cryptocurrencies (${cryptoCount}).`);
  } else if (cryptoCount > 0) {
    insights.push('Your recommended portfolio is concentrated in cryptocurrencies, which may increase volatility.');
  } else {
    insights.push('Your recommended portfolio focuses on traditional stocks, which typically offer more stability than cryptocurrencies.');
  }
  
  return insights;
}
