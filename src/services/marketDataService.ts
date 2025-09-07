// Market Data Service with Finnhub as primary source and updated realistic prices

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  companyName: string;
  sector: string;
  lastUpdated: Date;
}

interface MarketDataResponse {
  success: boolean;
  data?: StockQuote;
  error?: string;
}

class MarketDataService {
  private cache: Map<string, { data: StockQuote; expiresAt: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // API Sources - Multiple reliable sources with fallbacks
  private readonly API_SOURCES = {
    FINNHUB: 'https://finnhub.io/api/v1',
    FMP: 'https://financialmodelingprep.com/api/v3',
    ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
    YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance/chart',
    GOOGLE_FINANCE: 'https://www.google.com/finance/quote',
    MARKETSTACK: 'http://api.marketstack.com/v1',
    POLYGON: 'https://api.polygon.io/v2',
    IEX_CLOUD: 'https://cloud.iexapis.com/stable'
  };

  // API Keys (add to environment variables for production)
  private readonly FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';
  private readonly FMP_API_KEY = process.env.FMP_API_KEY || 'demo';
  private readonly ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'demo';
  private readonly MARKETSTACK_KEY = process.env.MARKETSTACK_KEY || '';
  private readonly POLYGON_KEY = process.env.POLYGON_KEY || '';
  private readonly IEX_CLOUD_KEY = process.env.IEX_CLOUD_KEY || '';

  // Company name mappings only (no hardcoded prices)
  private readonly COMPANY_NAMES: Record<string, string> = {
    'NVDA': 'NVIDIA Corporation',
    'MSFT': 'Microsoft Corporation',
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'TCS': 'Tata Consultancy Services',
    'INFY': 'Infosys Limited',
    'RELIANCE': 'Reliance Industries Limited',
    'HDFCBANK': 'HDFC Bank Limited',
    'ICICIBANK': 'ICICI Bank Limited',
    'BHARTIARTL': 'Bharti Airtel Limited',
    'ITC': 'ITC Limited',
    'SBIN': 'State Bank of India',
    'LT': 'Larsen & Toubro Limited',
    'HCLTECH': 'HCL Technologies Limited'
  };

  // Indian stock exchange mappings
  private readonly INDIAN_STOCKS = {
    'TCS': 'TCS:NSE',
    'INFY': 'INFY:NSE', 
    'RELIANCE': 'RELIANCE:NSE',
    'HDFCBANK': 'HDFCBANK:NSE',
    'ICICIBANK': 'ICICIBANK:NSE',
    'BHARTIARTL': 'BHARTIARTL:NSE',
    'ITC': 'ITC:NSE',
    'SBIN': 'SBIN:NSE',
    'LT': 'LT:NSE',
    'HCLTECH': 'HCLTECH:NSE'
  };

  // Basic sector mappings only (no hardcoded prices)
  private readonly SECTORS: Record<string, string> = {
    'NVDA': 'Technology',
    'MSFT': 'Technology',
    'AAPL': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'TCS': 'Information Technology',
    'INFY': 'Information Technology',
    'RELIANCE': 'Energy',
    'HDFCBANK': 'Financial Services',
    'ICICIBANK': 'Financial Services',
    'BHARTIARTL': 'Telecommunications',
    'ITC': 'Consumer Goods',
    'SBIN': 'Financial Services',
    'LT': 'Engineering & Construction',
    'HCLTECH': 'Information Technology'
  };

  // Check cache first
  private getCachedData(symbol: string): StockQuote | null {
    const cached = this.cache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    return null;
  }

  // Cache data
  private setCachedData(symbol: string, data: StockQuote): void {
    this.cache.set(symbol, {
      data,
      expiresAt: Date.now() + this.CACHE_DURATION
    });
  }

  // Try Finnhub API first (most reliable for real-time data)
  private async fetchFromFinnhub(symbol: string): Promise<StockQuote | null> {
    try {
      // Get quote
      const quoteUrl = `${this.API_SOURCES.FINNHUB}/quote?symbol=${symbol}&token=${this.FINNHUB_API_KEY}`;
      const quoteResponse = await fetch(quoteUrl);
      
      if (!quoteResponse.ok) {
        throw new Error(`Finnhub quote API error: ${quoteResponse.status}`);
      }
      
      const quoteData = await quoteResponse.json();
      
      // Get company profile for name and sector
      const profileUrl = `${this.API_SOURCES.FINNHUB}/stock/profile2?symbol=${symbol}&token=${this.FINNHUB_API_KEY}`;
      const profileResponse = await fetch(profileUrl);
      
      let companyName = symbol;
      let sector = 'Unknown';
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        companyName = profileData.name || symbol;
        sector = profileData.finnhubIndustry || 'Unknown';
      }

      if (quoteData.c && quoteData.c > 0) {
        return {
          symbol,
          price: quoteData.c, // current price
          change: quoteData.d, // change
          changePercent: quoteData.dp, // change percent
          companyName,
          sector,
          lastUpdated: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.log(`Finnhub API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Try Financial Modeling Prep API
  private async fetchFromFMP(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `${this.API_SOURCES.FMP}/quote/${symbol}?apikey=${this.FMP_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const quote = data[0];
        return {
          symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changesPercentage,
          companyName: quote.name || this.COMPANY_NAMES[symbol] || symbol,
          sector: this.SECTORS[symbol] || 'Unknown',
          lastUpdated: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.log(`FMP API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Try Yahoo Finance API (free, no API key required)
  private async fetchFromYahoo(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `${this.API_SOURCES.YAHOO_FINANCE}/${symbol}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }
      
      const data = await response.json();
      const chart = data.chart?.result?.[0];
      
      if (chart) {
        const meta = chart.meta;
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose;
        
        // Validate that we have valid price data
        if (currentPrice === undefined || currentPrice === null || 
            previousClose === undefined || previousClose === null ||
            isNaN(currentPrice) || isNaN(previousClose)) {
          console.log(`Invalid price data from Yahoo Finance for ${symbol}: price=${currentPrice}, previousClose=${previousClose}`);
          return null;
        }
        
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;
        
        return {
          symbol,
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          companyName: meta.longName || this.COMPANY_NAMES[symbol] || symbol,
          sector: this.SECTORS[symbol] || 'Unknown',
          lastUpdated: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.log(`Yahoo Finance API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Try Google Finance API (good for international stocks, especially Indian)
  private async fetchFromGoogle(symbol: string): Promise<StockQuote | null> {
    try {
      // Check if this is an Indian stock
      const isIndianStock = this.INDIAN_STOCKS.hasOwnProperty(symbol);
      
      if (isIndianStock) {
        console.log(`Attempting Google Finance for Indian stock: ${symbol}`);
        
        // For Indian stocks, we can try alternative approaches
        // Option 1: Try Yahoo Finance with NSE suffix
        try {
          const nseSymbol = `${symbol}.NS`;
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}`;
          const response = await fetch(yahooUrl);
          
          if (response.ok) {
            const data = await response.json();
            const chart = data.chart?.result?.[0];
            
            if (chart) {
              const meta = chart.meta;
              const currentPrice = meta.regularMarketPrice;
              const previousClose = meta.previousClose;
              const change = currentPrice - previousClose;
              const changePercent = (change / previousClose) * 100;
              
              console.log(`✅ Google Finance (via Yahoo NSE) provided data for ${symbol}`);
              
              return {
                symbol,
                price: currentPrice,
                change: change,
                changePercent: changePercent,
                companyName: this.COMPANY_NAMES[symbol] || symbol,
                sector: this.SECTORS[symbol] || 'Unknown',
                lastUpdated: new Date()
              };
            }
          }
        } catch (error) {
          console.log(`Yahoo NSE fallback failed for ${symbol}:`, error);
        }
        
        // Option 2: Try BSE suffix
        try {
          const bseSymbol = `${symbol}.BO`;
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${bseSymbol}`;
          const response = await fetch(yahooUrl);
          
          if (response.ok) {
            const data = await response.json();
            const chart = data.chart?.result?.[0];
            
            if (chart) {
              const meta = chart.meta;
              const currentPrice = meta.regularMarketPrice;
              const previousClose = meta.previousClose;
              const change = currentPrice - previousClose;
              const changePercent = (change / previousClose) * 100;
              
              console.log(`✅ Google Finance (via Yahoo BSE) provided data for ${symbol}`);
              
              return {
                symbol,
                price: currentPrice,
                change: change,
                changePercent: changePercent,
                companyName: this.COMPANY_NAMES[symbol] || symbol,
                sector: this.SECTORS[symbol] || 'Unknown',
                lastUpdated: new Date()
              };
            }
          }
        } catch (error) {
          console.log(`Yahoo BSE fallback failed for ${symbol}:`, error);
        }
      }
      
      return null;
    } catch (error) {
      console.log(`Google Finance API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Try Alpha Vantage API (free tier available)
  private async fetchFromAlphaVantage(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `${this.API_SOURCES.ALPHA_VANTAGE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }
      
      const data = await response.json();
      const quote = data['Global Quote'];
      
      if (quote && quote['05. price']) {
        const currentPrice = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
        
        return {
          symbol,
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          companyName: this.COMPANY_NAMES[symbol] || symbol,
          sector: this.SECTORS[symbol] || 'Unknown',
          lastUpdated: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.log(`Alpha Vantage API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Try IEX Cloud API (free tier available)
  private async fetchFromIEX(symbol: string): Promise<StockQuote | null> {
    try {
      if (!this.IEX_CLOUD_KEY) {
        console.log(`IEX Cloud API key not provided for ${symbol}`);
        return null;
      }
      
      const url = `${this.API_SOURCES.IEX_CLOUD}/stock/${symbol}/quote?token=${this.IEX_CLOUD_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`IEX Cloud API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.latestPrice) {
        return {
          symbol,
          price: data.latestPrice,
          change: data.change,
          changePercent: data.changePercent * 100, // IEX returns decimal
          companyName: data.companyName || this.COMPANY_NAMES[symbol] || symbol,
          sector: data.sector || this.SECTORS[symbol] || 'Unknown',
          lastUpdated: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.log(`IEX Cloud API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Try Polygon.io API (free tier available)
  private async fetchFromPolygon(symbol: string): Promise<StockQuote | null> {
    try {
      if (!this.POLYGON_KEY) {
        console.log(`Polygon API key not provided for ${symbol}`);
        return null;
      }
      
      const url = `${this.API_SOURCES.POLYGON}/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${this.POLYGON_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const change = result.c - result.o; // Close - Open
        const changePercent = (change / result.o) * 100;
        
        return {
          symbol,
          price: result.c,
          change: change,
          changePercent: changePercent,
          companyName: this.COMPANY_NAMES[symbol] || symbol,
          sector: this.SECTORS[symbol] || 'Unknown',
          lastUpdated: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.log(`Polygon API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Return N/A data when real-time data is unavailable
  private generateUnavailableData(symbol: string): StockQuote {
    return {
      symbol,
      price: 0, // Will be displayed as "N/A" in UI
      change: 0,
      changePercent: 0,
      companyName: this.COMPANY_NAMES[symbol] || symbol,
      sector: this.SECTORS[symbol] || 'N/A',
      lastUpdated: new Date()
    };
  }

  // Main method to get stock quote with comprehensive fallback chain
  async getStockQuote(symbol: string): Promise<MarketDataResponse> {
    try {
      // Check cache first
      const cachedData = this.getCachedData(symbol);
      if (cachedData) {
        return { success: true, data: cachedData };
      }

      console.log(`Fetching real-time market data for ${symbol} from multiple sources...`);

      // Try APIs in order of reliability and speed
      const apiMethods = [
        { name: 'Yahoo Finance', method: () => this.fetchFromYahoo(symbol) },
        { name: 'Google Finance', method: () => this.fetchFromGoogle(symbol) },
        { name: 'Alpha Vantage', method: () => this.fetchFromAlphaVantage(symbol) },
        { name: 'Finnhub', method: () => this.fetchFromFinnhub(symbol) },
        { name: 'FMP', method: () => this.fetchFromFMP(symbol) },
        { name: 'IEX Cloud', method: () => this.fetchFromIEX(symbol) },
        { name: 'Polygon', method: () => this.fetchFromPolygon(symbol) }
      ];

      let stockData: StockQuote | null = null;

      // Try each API until we get data
      for (const api of apiMethods) {
        try {
          console.log(`Trying ${api.name} for ${symbol}...`);
          stockData = await api.method();
          if (stockData) {
            console.log(`✅ ${api.name} successfully provided data for ${symbol}`);
            break;
          }
        } catch (error) {
          console.log(`❌ ${api.name} failed for ${symbol}:`, error);
          continue;
        }
      }

      // If all APIs fail, return N/A data
      if (!stockData) {
        console.log(`⚠️  All APIs failed for ${symbol}, returning N/A data`);
        stockData = this.generateUnavailableData(symbol);
      }

      // Cache the result
      this.setCachedData(symbol, stockData);

      return { success: true, data: stockData };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      
      // Return N/A data on error
      const unavailableData = this.generateUnavailableData(symbol);
      return { success: true, data: unavailableData };
    }
  }

  // Get quotes for multiple symbols
  async getMultipleQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const results: Record<string, StockQuote> = {};
    
    // Process symbols in parallel but limit concurrency to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(async (symbol) => {
        const result = await this.getStockQuote(symbol);
        if (result.success && result.data) {
          results[symbol] = result.data;
        }
        return { symbol, result };
      });
      
      await Promise.all(promises);
      
      // Add small delay between batches to be respectful to APIs
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  // Clear cache (useful for manual refresh)
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getCacheStats(): { size: number; symbols: string[] } {
    return {
      size: this.cache.size,
      symbols: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
export type { StockQuote, MarketDataResponse };
