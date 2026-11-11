"use client";

import { useState, useEffect } from 'react';
import { RiskProfile, InvestmentRecommendation, PortfolioOptimization, generateInvestmentRecommendations, optimizePortfolio, generateNaturalLanguageInsights } from '@/lib/ai-investment-advisor';
import { RiskProfileQuestionnaire } from './ai-investment-advisor';
import AIInvestmentAdvisorResults from './ai-investment-advisor-results';

export default function AIInvestmentAdvisorMain() {
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [recommendations, setRecommendations] = useState<InvestmentRecommendation[]>([]);
  const [portfolioOptimization, setPortfolioOptimization] = useState<PortfolioOptimization | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock current portfolio data
  const mockPortfolio = [
    {
      id: 1,
      name: 'Bitcoin',
      ticker: 'BTC',
      quantity: 0.5,
      avgBuyPrice: 3500000,
      totalValue: 1750000,
      price: 3500000,
      change: 2.5
    },
    {
      id: 2,
      name: 'Ethereum',
      ticker: 'ETH',
      quantity: 3,
      avgBuyPrice: 180000,
      totalValue: 540000,
      price: 180000,
      change: 1.8
    },
    {
      id: 3,
      name: 'Reliance Industries',
      ticker: 'RELIANCE',
      quantity: 10,
      avgBuyPrice: 2500,
      totalValue: 25000,
      price: 2500,
      change: 0.5
    },
    {
      id: 4,
      name: 'HDFC Bank',
      ticker: 'HDFCBANK',
      quantity: 15,
      avgBuyPrice: 1600,
      totalValue: 24000,
      price: 1600,
      change: -0.2
    }
  ];

  // Handle risk profile completion
  const handleRiskProfileComplete = async (profile: RiskProfile) => {
    setIsLoading(true);
    setRiskProfile(profile);

    try {
      // Generate investment recommendations
      const recs = await generateInvestmentRecommendations(profile, mockPortfolio);
      setRecommendations(recs);

      // Generate portfolio optimization
      const optimization = optimizePortfolio(mockPortfolio, recs, profile);
      setPortfolioOptimization(optimization);

      // Generate natural language insights
      const nlInsights = generateNaturalLanguageInsights(recs, profile);
      setInsights(nlInsights);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the advisor
  const handleReset = () => {
    setRiskProfile(null);
    setRecommendations([]);
    setPortfolioOptimization(null);
    setInsights([]);
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium">Analyzing market data and generating personalized recommendations...</p>
          <p className="text-sm text-gray-500">This may take a few moments</p>
        </div>
      ) : riskProfile ? (
        <AIInvestmentAdvisorResults
          riskProfile={riskProfile}
          recommendations={recommendations}
          portfolioOptimization={portfolioOptimization!}
          insights={insights}
          onReset={handleReset}
        />
      ) : (
        <RiskProfileQuestionnaire onComplete={handleRiskProfileComplete} />
      )}
    </div>
  );
}
