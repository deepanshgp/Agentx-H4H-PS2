"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import GeminiMarketPredictor from "@/components/gemini-market-predictor";

export default function MarketPredictorPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      <GeminiMarketPredictor />
    </div>
  );
}
