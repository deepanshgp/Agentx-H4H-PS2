"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft } from "lucide-react";
import AIInvestmentAdvisorMain from "@/components/ai-investment-advisor-main";
import Link from "next/link";

export default function AIAdvisorPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-dark flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-purple-500" />
            AI Investment Advisor
          </h2>
          <p className="text-gray-500 mt-1">
            Get personalized investment recommendations powered by advanced AI
          </p>
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardContent className="p-6">
            <AIInvestmentAdvisorMain />
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-6">
        <h3 className="text-lg font-medium mb-2">About AI Investment Advisor</h3>
        <p className="text-sm text-gray-600 mb-4">
          The AI Investment Advisor uses advanced machine learning algorithms to analyze market data, sentiment, and your personal risk profile to provide tailored investment recommendations. 
          Our system combines technical analysis, natural language processing of market news, and portfolio optimization techniques to help you make informed investment decisions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <h4 className="font-medium mb-1">Risk Analysis</h4>
            <p className="text-gray-600">Personalized risk assessment based on your financial goals and preferences</p>
          </div>
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <h4 className="font-medium mb-1">Market Sentiment</h4>
            <p className="text-gray-600">Real-time analysis of market trends, news, and social media sentiment</p>
          </div>
          <div className="p-3 bg-white rounded-md border border-gray-100">
            <h4 className="font-medium mb-1">Portfolio Optimization</h4>
            <p className="text-gray-600">AI-powered recommendations to optimize your asset allocation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
