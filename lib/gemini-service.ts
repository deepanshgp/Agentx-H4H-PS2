import { GoogleGenerativeAI } from '@google/generative-ai';
import { API_KEYS } from '@/config/api-keys';

// Initialize the Gemini API with your API key
// Note: In production, this should be stored in environment variables
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || API_KEYS.GEMINI;
const genAI = new GoogleGenerativeAI(API_KEY);

// Define the model to use - use the correct model name for the API version
const MODEL_NAME = 'gemini-3.8-flash';

// Interface for market trend prediction
export interface MarketTrendPrediction {
  asset: string;
  ticker: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  timeFrame: string;
  reasoning: string[];
  technicalIndicators: {
    name: string;
    value: string;
    interpretation: string;
  }[];
  supportLevel?: number;
  resistanceLevel?: number;
  lastUpdated: Date;
}

/**
 * Generate a market trend prediction using Gemini AI
 * @param assetName The name of the asset (e.g., "Bitcoin", "Apple Inc.")
 * @param ticker The ticker symbol of the asset (e.g., "BTC", "AAPL")
 * @param historicalData Optional historical price data to improve prediction accuracy
 * @param timeFrame The time frame for the prediction (e.g., "1 day", "1 week", "1 month")
 * @returns A promise that resolves to a MarketTrendPrediction object
 */
export async function predictMarketTrend(
  assetName: string,
  ticker: string,
  historicalData?: { date: string; price: number }[],
  timeFrame: string = '1 week'
): Promise<MarketTrendPrediction> {
  try {
    // Create a prompt for Gemini that includes all relevant information
    const currentDate = new Date().toISOString().split('T')[0];
    
    let prompt = `You are a financial expert specializing in market trend analysis. 
    Based on the latest market data and trends, predict whether ${assetName} (${ticker}) 
    will be bullish or bearish in the next ${timeFrame}. Today's date is ${currentDate}. 
    Provide a detailed analysis with reasoning and confidence level.`;
    
    // Add historical data to the prompt if available
    if (historicalData && historicalData.length > 0) {
      prompt += `\n\nHistorical price data for ${assetName}:\n`;
      historicalData.forEach(dataPoint => {
        prompt += `${dataPoint.date}: ${dataPoint.price}\n`;
      });
    }
    
    prompt += `\n\nRespond with a JSON object with the following structure:
    {
      "prediction": "bullish" or "bearish" or "neutral",
      "confidence": number between 0-100,
      "reasoning": [array of reasons for the prediction],
      "technicalIndicators": [
        { "name": "indicator name", "value": "indicator value", "interpretation": "what this means" }
      ],
      "supportLevel": number or null,
      "resistanceLevel": number or null
    }`;
    
    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Generate the response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    // We need to extract the JSON part from the response as Gemini might include additional text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response');
    }
    
    const jsonResponse = JSON.parse(jsonMatch[0]);
    
    // Create and return the prediction object
    return {
      asset: assetName,
      ticker: ticker,
      prediction: jsonResponse.prediction as 'bullish' | 'bearish' | 'neutral',
      confidence: jsonResponse.confidence,
      timeFrame: timeFrame,
      reasoning: jsonResponse.reasoning || [],
      technicalIndicators: jsonResponse.technicalIndicators || [],
      supportLevel: jsonResponse.supportLevel || undefined,
      resistanceLevel: jsonResponse.resistanceLevel || undefined,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error predicting market trend with Gemini:', error);
    
    // Return a fallback prediction if the API call fails
    return {
      asset: assetName,
      ticker: ticker,
      prediction: 'neutral',
      confidence: 50,
      timeFrame: timeFrame,
      reasoning: ['API error occurred. This is a fallback prediction.'],
      technicalIndicators: [],
      lastUpdated: new Date()
    };
  }
}

/**
 * Get market insights for multiple assets using Gemini AI
 * @param assets Array of assets to analyze
 * @param timeFrame The time frame for the predictions
 * @returns A promise that resolves to an array of MarketTrendPrediction objects
 */
export async function batchPredictMarketTrends(
  assets: Array<{ name: string; ticker: string }>,
  timeFrame: string = '1 week'
): Promise<MarketTrendPrediction[]> {
  try {
    // Create a prompt for Gemini that includes all assets
    const currentDate = new Date().toISOString().split('T')[0];
    
    let prompt = `You are a financial expert specializing in market trend analysis. 
    Based on the latest market data and trends, predict whether the following assets 
    will be bullish or bearish in the next ${timeFrame}. Today's date is ${currentDate}. 
    Provide a detailed analysis with reasoning and confidence level for each asset.\n\n`;
    
    assets.forEach(asset => {
      prompt += `Asset: ${asset.name} (${asset.ticker})\n`;
    });
    
    prompt += `\n\nRespond with a JSON array where each object has the following structure:
    {
      "asset": "asset name",
      "ticker": "ticker symbol",
      "prediction": "bullish" or "bearish" or "neutral",
      "confidence": number between 0-100,
      "reasoning": [array of reasons for the prediction],
      "technicalIndicators": [
        { "name": "indicator name", "value": "indicator value", "interpretation": "what this means" }
      ],
      "supportLevel": number or null,
      "resistanceLevel": number or null
    }`;
    
    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Generate the response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response for batch predictions');
    }
    
    const jsonResponse = JSON.parse(jsonMatch[0]);
    
    // Create and return the prediction objects
    return jsonResponse.map((item: any) => ({
      asset: item.asset,
      ticker: item.ticker,
      prediction: item.prediction as 'bullish' | 'bearish' | 'neutral',
      confidence: item.confidence,
      timeFrame: timeFrame,
      reasoning: item.reasoning || [],
      technicalIndicators: item.technicalIndicators || [],
      supportLevel: item.supportLevel || undefined,
      resistanceLevel: item.resistanceLevel || undefined,
      lastUpdated: new Date()
    }));
  } catch (error) {
    console.error('Error batch predicting market trends with Gemini:', error);
    
    // Return fallback predictions if the API call fails
    return assets.map(asset => ({
      asset: asset.name,
      ticker: asset.ticker,
      prediction: 'neutral',
      confidence: 50,
      timeFrame: timeFrame,
      reasoning: ['API error occurred. This is a fallback prediction.'],
      technicalIndicators: [],
      lastUpdated: new Date()
    }));
  }
}
