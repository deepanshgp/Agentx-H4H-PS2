"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, TrendingUp, BarChart3, PieChart, Brain, AlertTriangle, ChevronRight, ArrowUpRight, ArrowDownRight, Info, Check, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { RiskProfile, MarketSentiment, InvestmentRecommendation, PortfolioOptimization, analyzeRiskProfile, generateInvestmentRecommendations, optimizePortfolio, generateNaturalLanguageInsights } from '@/lib/ai-investment-advisor';

// Risk profile questionnaire component
export const RiskProfileQuestionnaire = ({ onComplete }: { onComplete: (profile: RiskProfile) => void }) => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({
    age: 30,
    incomeStability: 'stable',
    investmentExperience: 'intermediate',
    riskAttitude: 'moderate',
    timeHorizon: '2-5 years',
    financialGoals: ['retirement', 'wealth_growth'],
    preferredSectors: [],
    excludedSectors: [],
    monthlyInvestment: 10000
  });

  const handleInputChange = (field: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiSelect = (field: string, value: string) => {
    setAnswers(prev => {
      const currentValues = prev[field] || [];
      if (currentValues.includes(value)) {
        return {
          ...prev,
          [field]: currentValues.filter((v: string) => v !== value)
        };
      } else {
        return {
          ...prev,
          [field]: [...currentValues, value]
        };
      }
    });
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Complete the questionnaire and analyze risk profile
      const riskProfile = analyzeRiskProfile(answers);
      onComplete(riskProfile);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="mr-2 h-5 w-5" />
          AI Investment Advisor - Risk Profile
        </CardTitle>
        <CardDescription>
          Help us understand your investment preferences to provide personalized recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 4</span>
            <span className="text-sm text-muted-foreground">{step === 1 ? 'Basic Information' : step === 2 ? 'Risk Assessment' : step === 3 ? 'Investment Preferences' : 'Financial Goals'}</span>
          </div>
          <Progress value={step * 25} className="h-2" />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="age">Your Age</Label>
              <Input
                id="age"
                type="number"
                value={answers.age}
                onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                min={18}
                max={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="income-stability">Income Stability</Label>
              <Select
                value={answers.incomeStability}
                onValueChange={(value) => handleInputChange('incomeStability', value)}
              >
                <SelectTrigger id="income-stability">
                  <SelectValue placeholder="Select income stability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="very stable">Very Stable (Government, Tenured)</SelectItem>
                  <SelectItem value="stable">Stable (Established Company)</SelectItem>
                  <SelectItem value="somewhat stable">Somewhat Stable (Contract Work)</SelectItem>
                  <SelectItem value="unstable">Unstable (Commission-based, Freelance)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-investment">Monthly Investment Capacity (₹)</Label>
              <Input
                id="monthly-investment"
                type="number"
                value={answers.monthlyInvestment}
                onChange={(e) => handleInputChange('monthlyInvestment', parseInt(e.target.value))}
                min={1000}
                step={1000}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="investment-experience">Investment Experience</Label>
              <RadioGroup
                value={answers.investmentExperience}
                onValueChange={(value) => handleInputChange('investmentExperience', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="beginner" id="experience-beginner" />
                  <Label htmlFor="experience-beginner">Beginner (Less than 2 years)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="intermediate" id="experience-intermediate" />
                  <Label htmlFor="experience-intermediate">Intermediate (2-5 years)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="experienced" id="experience-experienced" />
                  <Label htmlFor="experience-experienced">Experienced (5+ years)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk-attitude">Risk Attitude</Label>
              <RadioGroup
                value={answers.riskAttitude}
                onValueChange={(value) => handleInputChange('riskAttitude', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="conservative" id="risk-conservative" />
                  <Label htmlFor="risk-conservative">Conservative (Prioritize capital preservation)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="risk-moderate" />
                  <Label htmlFor="risk-moderate">Moderate (Balance growth and safety)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="aggressive" id="risk-aggressive" />
                  <Label htmlFor="risk-aggressive">Aggressive (Maximize growth potential)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-horizon">Investment Time Horizon</Label>
              <Select
                value={answers.timeHorizon}
                onValueChange={(value) => handleInputChange('timeHorizon', value)}
              >
                <SelectTrigger id="time-horizon">
                  <SelectValue placeholder="Select time horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less than 2 years">Short-term (Less than 2 years)</SelectItem>
                  <SelectItem value="2-5 years">Medium-term (2-5 years)</SelectItem>
                  <SelectItem value="more than 5 years">Long-term (More than 5 years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preferred Investment Sectors</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'tech', label: 'Technology' },
                  { id: 'finance', label: 'Financial Services' },
                  { id: 'healthcare', label: 'Healthcare' },
                  { id: 'consumer', label: 'Consumer Goods' },
                  { id: 'energy', label: 'Energy' },
                  { id: 'real_estate', label: 'Real Estate' },
                  { id: 'crypto', label: 'Cryptocurrency' },
                  { id: 'commodities', label: 'Commodities' }
                ].map((sector) => (
                  <div key={sector.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sector-${sector.id}`}
                      checked={answers.preferredSectors?.includes(sector.id)}
                      onCheckedChange={() => handleMultiSelect('preferredSectors', sector.id)}
                    />
                    <Label htmlFor={`sector-${sector.id}`}>{sector.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sectors to Exclude</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'tobacco', label: 'Tobacco' },
                  { id: 'gambling', label: 'Gambling' },
                  { id: 'weapons', label: 'Defense & Weapons' },
                  { id: 'alcohol', label: 'Alcohol' },
                  { id: 'fossil_fuels', label: 'Fossil Fuels' },
                  { id: 'adult', label: 'Adult Entertainment' }
                ].map((sector) => (
                  <div key={sector.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exclude-${sector.id}`}
                      checked={answers.excludedSectors?.includes(sector.id)}
                      onCheckedChange={() => handleMultiSelect('excludedSectors', sector.id)}
                    />
                    <Label htmlFor={`exclude-${sector.id}`}>{sector.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Financial Goals</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'retirement', label: 'Retirement Planning' },
                  { id: 'wealth_growth', label: 'Wealth Growth' },
                  { id: 'education', label: 'Education Fund' },
                  { id: 'home_purchase', label: 'Home Purchase' },
                  { id: 'passive_income', label: 'Passive Income' },
                  { id: 'tax_saving', label: 'Tax Saving' },
                  { id: 'emergency_fund', label: 'Emergency Fund' },
                  { id: 'major_purchase', label: 'Major Purchase' }
                ].map((goal) => (
                  <div key={goal.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`goal-${goal.id}`}
                      checked={answers.financialGoals?.includes(goal.id)}
                      onCheckedChange={() => handleMultiSelect('financialGoals', goal.id)}
                    />
                    <Label htmlFor={`goal-${goal.id}`}>{goal.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Almost done!</AlertTitle>
              <AlertDescription>
                Click 'Generate Recommendations' to get your personalized AI investment advice.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
        >
          Back
        </Button>
        <Button onClick={handleNext}>
          {step < 4 ? 'Next' : 'Generate Recommendations'}
        </Button>
      </CardFooter>
    </Card>
  );
};
