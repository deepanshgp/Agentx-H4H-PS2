import InvestmentPredictor from "@/components/investment-predictor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp } from "lucide-react";

export default function PredictorPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Investment Predictor</h1>
      <p className="text-gray-500">
        Analyze potential returns on crypto and stock investments with our prediction tool.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prediction Tool
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AI-Powered</div>
            <p className="text-xs text-muted-foreground">
              Uses historical data patterns to predict future performance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Market Coverage
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Crypto & Stocks</div>
            <p className="text-xs text-muted-foreground">
              Comprehensive coverage of major investment assets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prediction Range</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7-90 Days</div>
            <p className="text-xs text-muted-foreground">
              Short to medium-term investment forecasting
            </p>
          </CardContent>
        </Card>
      </div>
      
      <InvestmentPredictor />
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5" />
            Investment Tips
          </CardTitle>
          <CardDescription>
            Smart strategies for better investment decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-md">
                <h3 className="font-medium mb-2">Diversify Your Portfolio</h3>
                <p className="text-sm text-gray-500">
                  Don't put all your eggs in one basket. Spread your investments across different asset classes to reduce risk.
                </p>
              </div>
              <div className="p-4 border rounded-md">
                <h3 className="font-medium mb-2">Long-term Perspective</h3>
                <p className="text-sm text-gray-500">
                  Focus on long-term growth rather than short-term market fluctuations for more consistent returns.
                </p>
              </div>
              <div className="p-4 border rounded-md">
                <h3 className="font-medium mb-2">Research Before Investing</h3>
                <p className="text-sm text-gray-500">
                  Always do your homework on assets before investing. Understand the fundamentals and market trends.
                </p>
              </div>
              <div className="p-4 border rounded-md">
                <h3 className="font-medium mb-2">Set Clear Goals</h3>
                <p className="text-sm text-gray-500">
                  Define your investment objectives, time horizon, and risk tolerance to guide your investment strategy.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
