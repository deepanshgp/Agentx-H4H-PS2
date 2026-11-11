// Real-time market data API integration
import { cryptoData, stocksData } from './data';

// Function to fetch real-time cryptocurrency data from CoinGecko
export async function fetchRealTimeCryptoData() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch crypto data');
    }
    
    const data = await response.json();
    
    return data.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      ticker: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change: coin.price_change_percentage_24h,
      marketCap: formatMarketCap(coin.market_cap),
      volume: formatMarketCap(coin.total_volume),
      image: coin.image,
    }));
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    // Return mock data as fallback
    return cryptoData;
  }
}

// Indian stock symbols on NSE — mapped to Yahoo Finance suffix (.NS)
const INDIAN_STOCKS = [
  { ticker: 'RELIANCE',   yahooSymbol: 'RELIANCE.NS'   },
  { ticker: 'HDFCBANK',   yahooSymbol: 'HDFCBANK.NS'   },
  { ticker: 'INFY',       yahooSymbol: 'INFY.NS'        },
  { ticker: 'TCS',        yahooSymbol: 'TCS.NS'         },
  { ticker: 'ICICIBANK',  yahooSymbol: 'ICICIBANK.NS'   },
  { ticker: 'HINDUNILVR', yahooSymbol: 'HINDUNILVR.NS'  },
  { ticker: 'BHARTIARTL', yahooSymbol: 'BHARTIARTL.NS'  },
  { ticker: 'ITC',        yahooSymbol: 'ITC.NS'         },
  { ticker: 'WIPRO',      yahooSymbol: 'WIPRO.NS'       },
  { ticker: 'BAJFINANCE', yahooSymbol: 'BAJFINANCE.NS'  },
  { ticker: 'TATAMOTORS', yahooSymbol: 'TATAMOTORS.NS'  },
];

// Fetch real-time Indian stock data from Yahoo Finance (no API key required)
export async function fetchRealTimeStockData() {
  try {
    const symbols = INDIAN_STOCKS.map(s => s.yahooSymbol).join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,marketCap,regularMarketVolume,longName,shortName`;

    const response = await fetch(url, {
      headers: {
        // Yahoo Finance requires a browser-like User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data = await response.json();
    const quotes = data?.quoteResponse?.result;

    if (!Array.isArray(quotes) || quotes.length === 0) {
      throw new Error('No quotes returned from Yahoo Finance');
    }

    const results = quotes.map((q: any) => {
      // Map Yahoo symbol back to our ticker (strip .NS)
      const ticker = q.symbol?.replace('.NS', '').replace('.BSE', '') ?? q.symbol;
      const staticInfo = stocksData.find(s => s.ticker === ticker);

      return {
        id: ticker,
        name: q.longName || q.shortName || staticInfo?.name || ticker,
        ticker,
        price: q.regularMarketPrice ?? staticInfo?.price ?? 0,
        change: q.regularMarketChangePercent ?? staticInfo?.change ?? 0,
        marketCap: q.marketCap ? formatMarketCap(q.marketCap) : (staticInfo?.marketCap ?? 'N/A'),
        volume: q.regularMarketVolume ? formatMarketCap(q.regularMarketVolume) : (staticInfo?.volume ?? 'N/A'),
      };
    });

    // Fill in any missing tickers with static fallback
    const returnedTickers = new Set(results.map((r: any) => r.ticker));
    const missing = stocksData.filter(s => !returnedTickers.has(s.ticker));
    return [...results, ...missing];

  } catch (error) {
    console.error('Error fetching Indian stock data from Yahoo Finance:', error);
    // Return static data as fallback — prices are always available
    return stocksData;
  }
}

// Format large numbers for display
function formatMarketCap(value: number): string {
  if (value >= 1e12) {
    return (value / 1e12).toFixed(1) + 'T';
  } else if (value >= 1e9) {
    return (value / 1e9).toFixed(1) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  } else {
    return value.toString();
  }
}

// Function to update user portfolio with real-time prices
export function updatePortfolioWithRealTimeData(portfolio: any[], marketData: any[]) {
  return portfolio.map(item => {
    const currentMarketData = marketData.find(market => market.ticker === item.ticker);
    
    if (!currentMarketData) return item;
    
    const newPrice = currentMarketData.price;
    const totalValue = newPrice * item.quantity;
    const profit = totalValue - (item.avgBuyPrice * item.quantity);
    const profitPercentage = (profit / (item.avgBuyPrice * item.quantity)) * 100;
    
    return {
      ...item,
      price: newPrice,
      change: currentMarketData.change,
      totalValue: totalValue,
      profit: profit,
      profitPercentage: profitPercentage,
    };
  });
}
