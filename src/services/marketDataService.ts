// Market Data Service with Yahoo Finance as primary source and enhanced sector tracking
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import { Logger, logMarket, logCache, logPerf, logError, logApi } from '@/lib/logger';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  companyName: string;
  sector: string;
  lastUpdated: Date;
  exchange?: string;
  currency?: string;
  exchangeTimezoneName?: string;
}

interface MarketDataResponse {
  success: boolean;
  data?: StockQuote;
  error?: string;
}

interface StoredStockInfo {
  symbol: string;
  companyName: string;
  sector: string;
  exchange: string;
  currency: string;
  lastPrice: number;
  lastUpdated: string;
  dailyChange?: number;
  dailyChangePercent?: number;
  dailyChangeDate?: string; // Track which date the daily change is for
}

interface StocksDatabase {
  stocks: Record<string, StoredStockInfo>;
  lastUpdated: string | null;
}

class MarketDataService {
  private cache: Map<string, { data: StockQuote; expiresAt: number }> = new Map();
  private sectorCache: Map<string, { sector: string; expiresAt: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  private readonly SECTOR_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours cache for sectors
  private readonly STOCKS_DB_PATH = path.join(process.cwd(), 'data', 'stocks.json');

  // Add request debouncing to avoid duplicate requests for same symbol
  private pendingRequests: Map<string, Promise<MarketDataResponse>> = new Map();

  // Helper methods for deterministic random generation
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Create a custom fetch function that bypasses SSL verification for development
  private async customFetch(url: string, options?: RequestInit): Promise<Response> {
    // For Node.js environment (server-side), we can configure the agent
    if (typeof window === 'undefined') {
      const { default: fetch } = await import('node-fetch');
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false // This bypasses SSL certificate verification
      });
      
      // Convert options to node-fetch compatible format
      const nodeOptions: any = {
        ...options,
        agent: httpsAgent
      };
      
      return fetch(url, nodeOptions) as unknown as Response;
    } else {
      // For browser environment, use regular fetch
      return fetch(url, options);
    }
  }

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

  // Country-specific exchanges
  private readonly COUNTRY_EXCHANGES: Record<string, string[]> = {
    'India': ['NSE', 'BSE'],
    'USA': ['NYSE', 'NASDAQ']
  };

  // Indian stock exchange mappings (for backward compatibility)
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

  // Comprehensive sector mappings for common stocks
  private readonly SECTORS: Record<string, string> = {
    // Technology
    'NVDA': 'Technology',
    'MSFT': 'Technology',
    'AAPL': 'Technology',
    'GOOGL': 'Technology',
    'ADBE': 'Technology',
    'CRM': 'Technology',
    'ORCL': 'Technology',
    'IBM': 'Technology',
    'INTC': 'Technology',
    'AMD': 'Technology',
    'PANW': 'Technology',

    // Consumer Discretionary
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'NKE': 'Consumer Discretionary',
    'HD': 'Consumer Discretionary',
    'MCD': 'Consumer Discretionary',
    'SBUX': 'Consumer Discretionary',
    'TGT': 'Consumer Discretionary',
    'LOW': 'Consumer Discretionary',

    // Financial Services
    'JPM': 'Financial Services',
    'MS': 'Financial Services',
    'BAC': 'Financial Services',
    'GS': 'Financial Services',
    'WFC': 'Financial Services',
    'C': 'Financial Services',
    'BRK.B': 'Financial Services',
    'HDFCBANK': 'Financial Services',
    'ICICIBANK': 'Financial Services',
    'SBIN': 'Financial Services',

    // Healthcare & Pharmaceuticals
    'JNJ': 'Healthcare',
    'PFE': 'Healthcare',
    'UNH': 'Healthcare',
    'MRCK': 'Healthcare',
    'ABT': 'Healthcare',
    'TMO': 'Healthcare',
    'CVS': 'Healthcare',

    // Utilities
    'SO': 'Utilities',
    'NEE': 'Utilities',
    'DUK': 'Utilities',
    'AEP': 'Utilities',
    'EXC': 'Utilities',

    // Consumer Staples
    'PG': 'Consumer Staples',
    'KO': 'Consumer Staples',
    'PEP': 'Consumer Staples',
    'WMT': 'Consumer Staples',
    'COST': 'Consumer Staples',
    'ITC': 'Consumer Staples',

    // Auto Retail
    'AAP': 'Consumer Discretionary',
    'AZO': 'Consumer Discretionary',
    'ORLY': 'Consumer Discretionary',

    // Aerospace & Defense
    'RKLB': 'Industrials',
    'LMT': 'Industrials',
    'RTX': 'Industrials',
    'BA': 'Industrials',
    'NOC': 'Industrials',

    // ETFs
    'SOXX': 'Technology ETF',
    'SPY': 'Broad Market ETF',
    'QQQ': 'Technology ETF',
    'VTI': 'Broad Market ETF',
    'ARKK': 'Innovation ETF',

    // Indian IT Companies
    'TCS': 'Information Technology',
    'INFY': 'Information Technology',
    'HCLTECH': 'Information Technology',
    'WIPRO': 'Information Technology',
    'WIT': 'Information Technology', // Wipro ADR
    'LTTS': 'Information Technology',
    'MINDTREE': 'Information Technology',

    // Indian Other Sectors
    'RELIANCE': 'Energy',
    'BHARTIARTL': 'Telecommunications',
    'LT': 'Engineering & Construction',
    'TATAMOTORS': 'Automotive',
    'ADANIPORTS': 'Infrastructure',

    // Real Estate & Infrastructure
    'AMT': 'Real Estate',
    'PLD': 'Real Estate',
    'CCI': 'Real Estate',
    'EQIX': 'Real Estate',
    'AD': 'Real Estate', // Array Digital Infrastructure

    // Energy
    'XOM': 'Energy',
    'CVX': 'Energy',
    'COP': 'Energy',
    'EOG': 'Energy',
    'SLB': 'Energy',

    // Communications
    'VZ': 'Communications',
    'T': 'Communications',
    'TMUS': 'Communications',
    'NFLX': 'Communications',
    'META': 'Communications',
    'DIS': 'Communications'
  };

  // Check cache first
  private getCachedData(symbol: string, targetExchange?: string): StockQuote | null {
    const cacheKey = targetExchange ? `${symbol}:${targetExchange}` : symbol;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    return null;
  }

  // Cache data
  private setCachedData(symbol: string, data: StockQuote, targetExchange?: string): void {
    const cacheKey = targetExchange ? `${symbol}:${targetExchange}` : symbol;
    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.CACHE_DURATION
    });

    // Cache sector information separately for longer duration
    if (data.sector && data.sector !== 'Unknown') {
      this.setCachedSector(symbol, data.sector);
    }
  }

  // Cache sector information
  private setCachedSector(symbol: string, sector: string): void {
    if (sector && sector !== 'Unknown') {
      this.sectorCache.set(symbol, {
        sector,
        expiresAt: Date.now() + this.SECTOR_CACHE_DURATION
      });
    }
  }

  // Get cached sector
  private getCachedSector(symbol: string): string | null {
    const cached = this.sectorCache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.sector;
    }
    return null;
  }

  // Get best available sector using multiple sources
  private async getBestSector(symbol: string): Promise<string> {
    // 1. Check sector cache first
    const cachedSector = this.getCachedSector(symbol);
    if (cachedSector) {
      logCache('sector', symbol, true);
      logMarket(`Using cached sector: ${cachedSector}`, symbol);
      return cachedSector;
    }

    // 2. Check stored data
    try {
      const storedInfo = await this.getStoredStockInfo(symbol);
      if (storedInfo && storedInfo.sector && storedInfo.sector !== 'Unknown') {
        const validatedSector = this.validateSector(storedInfo.sector);
        if (validatedSector) {
          this.setCachedSector(symbol, validatedSector);
          logMarket(`Using stored sector: ${validatedSector}`, symbol);
          return validatedSector;
        }
      }
    } catch (error) {
      logError(`Failed to get stored sector for ${symbol}`, error, 'MarketDataService');
    }

    // 3. Check hardcoded mapping
    if (this.SECTORS[symbol]) {
      const sector = this.SECTORS[symbol];
      this.setCachedSector(symbol, sector);
      console.log(`🗂️ Using hardcoded sector for ${symbol}: ${sector}`);
      return sector;
    }

    // 4. Return Unknown as final fallback
    return 'Unknown';
  }

  // Get US exchange for symbol if it exists (for multi-listed stocks)
  private async getUSExchangeForSymbol(symbol: string): Promise<string | null> {
    try {
      // Try to fetch from Yahoo Finance without any suffix (US exchanges)
      const url = `${this.API_SOURCES.YAHOO_FINANCE}/${symbol}`;
      const response = await this.customFetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const chart = data.chart?.result?.[0];
        if (chart?.meta?.exchangeName) {
          const exchangeName = chart.meta.exchangeName.toUpperCase();
          // Return US exchanges only
          if (exchangeName.includes('NASDAQ')) return 'NASDAQ';
          if (exchangeName.includes('NYSE')) return 'NYSE';
        }
      }
      
      return null; // No US listing found
    } catch (error) {
      console.log(`Could not determine US exchange for ${symbol}:`, error);
      return null;
    }
  }

  // Get the actual exchange where a stock is listed (dynamically)
  private async getStockExchange(symbol: string): Promise<string> {
    try {
      // Try to get exchange info from Yahoo Finance first
      const exchangeInfo = await this.getExchangeFromYahoo(symbol);
      if (exchangeInfo) {
        return exchangeInfo;
      }
      
      // Fallback: Try to determine from symbol patterns or known Indian stocks
      if (this.INDIAN_STOCKS.hasOwnProperty(symbol)) {
        return 'NSE'; // Default to NSE for known Indian stocks
      }
      
      // Default to NASDAQ for unknown stocks
      return 'NASDAQ';
    } catch (error) {
      console.log(`Error determining exchange for ${symbol}:`, error);
      return 'NASDAQ'; // Safe fallback
    }
  }

  // Get exchange information from Yahoo Finance
  private async getExchangeFromYahoo(symbol: string): Promise<string | null> {
    try {
      // Try US exchanges first
      const usSymbolUrl = `${this.API_SOURCES.YAHOO_FINANCE}/${symbol}`;
      const usResponse = await this.customFetch(usSymbolUrl);
      
      if (usResponse.ok) {
        const usData = await usResponse.json();
        const usChart = usData.chart?.result?.[0];
        if (usChart?.meta?.exchangeName) {
          const exchangeName = usChart.meta.exchangeName.toUpperCase();
          // Map Yahoo Finance exchange names to our standard names
          if (exchangeName.includes('NASDAQ')) return 'NASDAQ';
          if (exchangeName.includes('NYSE')) return 'NYSE';
          if (exchangeName.includes('NSE')) return 'NSE';
          if (exchangeName.includes('BSE')) return 'BSE';
        }
      }
      
      // Try NSE if US didn't work
      const nseSymbolUrl = `${this.API_SOURCES.YAHOO_FINANCE}/${symbol}.NS`;
      const nseResponse = await this.customFetch(nseSymbolUrl);
      
      if (nseResponse.ok) {
        const nseData = await nseResponse.json();
        const nseChart = nseData.chart?.result?.[0];
        if (nseChart?.meta?.regularMarketPrice) {
          return 'NSE';
        }
      }
      
      // Try BSE
      const bseSymbolUrl = `${this.API_SOURCES.YAHOO_FINANCE}/${symbol}.BO`;
      const bseResponse = await this.customFetch(bseSymbolUrl);
      
      if (bseResponse.ok) {
        const bseData = await bseResponse.json();
        const bseChart = bseData.chart?.result?.[0];
        if (bseChart?.meta?.regularMarketPrice) {
          return 'BSE';
        }
      }
      
      return null;
    } catch (error) {
      console.log(`Error fetching exchange info for ${symbol}:`, error);
      return null;
    }
  }


  // Check if a stock is listed on Indian exchanges (dynamically)
  private async isIndianStock(symbol: string): Promise<boolean> {
    const exchange = await this.getStockExchange(symbol);
    return exchange === 'NSE' || exchange === 'BSE';
  }

  // Stocks Database Management
  private async readStocksDatabase(): Promise<StocksDatabase> {
    try {
      const data = await fs.readFile(this.STOCKS_DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, return empty database
      return {
        stocks: {},
        lastUpdated: null
      };
    }
  }

  private async writeStocksDatabase(database: StocksDatabase): Promise<void> {
    try {
      await fs.writeFile(this.STOCKS_DB_PATH, JSON.stringify(database, null, 2));
    } catch (error) {
      console.error('Failed to write stocks database:', error);
    }
  }

  private async updateStockInfo(stockQuote: StockQuote): Promise<void> {
    try {
      const database = await this.readStocksDatabase();
      const today = new Date().toISOString().split('T')[0];

      database.stocks[stockQuote.symbol] = {
        symbol: stockQuote.symbol,
        companyName: stockQuote.companyName,
        sector: stockQuote.sector,
        exchange: this.getExchange(stockQuote.symbol),
        currency: this.getCurrency(stockQuote.symbol),
        lastPrice: stockQuote.price,
        lastUpdated: new Date().toISOString(),
        // Include daily change from fresh stock quote
        dailyChange: stockQuote.change,
        dailyChangePercent: stockQuote.changePercent,
        dailyChangeDate: today
      };

      database.lastUpdated = new Date().toISOString();
      await this.writeStocksDatabase(database);
    } catch (error) {
      console.error('Failed to update stock info:', error);
    }
  }

  // Update all existing stocks with correct sector information
  async updateAllStockSectors(): Promise<void> {
    try {
      console.log('🔄 Updating sectors for all stocks...');
      const database = await this.readStocksDatabase();
      let updatedCount = 0;

      for (const [symbol, stockInfo] of Object.entries(database.stocks)) {
        const currentSector = stockInfo.sector;
        const correctSector = this.SECTORS[symbol];

        if (correctSector && (currentSector === 'Unknown' || currentSector !== correctSector)) {
          database.stocks[symbol].sector = correctSector;
          updatedCount++;
          console.log(`✅ Updated ${symbol}: ${currentSector} → ${correctSector}`);
        }
      }

      if (updatedCount > 0) {
        database.lastUpdated = new Date().toISOString();
        await this.writeStocksDatabase(database);
        console.log(`🎉 Updated sectors for ${updatedCount} stocks`);
      } else {
        console.log('ℹ️ All stocks already have correct sector information');
      }
    } catch (error) {
      console.error('Failed to update stock sectors:', error);
    }
  }

  private async updateDailyChangeForStock(symbol: string, dailyChange: number, dailyChangePercent: number, date: string): Promise<void> {
    try {
      const database = await this.readStocksDatabase();
      
      if (database.stocks[symbol]) {
        database.stocks[symbol].dailyChange = dailyChange;
        database.stocks[symbol].dailyChangePercent = dailyChangePercent;
        database.stocks[symbol].dailyChangeDate = date;
        await this.writeStocksDatabase(database);
      }
    } catch (error) {
      console.error('Failed to update daily change for stock:', error);
    }
  }

  private getExchange(symbol: string): string {
    if (this.INDIAN_STOCKS.hasOwnProperty(symbol)) {
      return 'NSE';
    }
    return 'NASDAQ'; // Default for US stocks
  }

  private getCurrency(symbol: string): string {
    if (this.INDIAN_STOCKS.hasOwnProperty(symbol)) {
      return 'INR';
    }
    return 'USD'; // Default for US stocks
  }

  async getStoredStockInfo(symbol: string): Promise<StoredStockInfo | null> {
    try {
      const database = await this.readStocksDatabase();
      return database.stocks[symbol] || null;
    } catch (error) {
      console.error('Failed to get stored stock info:', error);
      return null;
    }
  }

  async getAllStoredStocks(): Promise<StoredStockInfo[]> {
    try {
      const database = await this.readStocksDatabase();
      return Object.values(database.stocks);
    } catch (error) {
      console.error('Failed to get all stored stocks:', error);
      return [];
    }
  }

  // Validate and clean sector name
  private validateSector(sector: string | undefined | null): string | null {
    if (!sector || sector === 'N/A' || sector === 'Unknown' || sector.trim() === '') {
      return null;
    }

    // Clean up sector name
    const cleanSector = sector.trim();

    // Map common variations to standard names
    const sectorMappings: Record<string, string> = {
      'Information Technology': 'Technology',
      'Communication Services': 'Communications',
      'Consumer Cyclical': 'Consumer Discretionary',
      'Consumer Defensive': 'Consumer Staples',
      'Real Estate Investment Trusts (REITs)': 'Real Estate',
      'Basic Materials': 'Materials',
      'Financial Services': 'Financial Services',
      'Industrials': 'Industrials',
      'Energy': 'Energy',
      'Utilities': 'Utilities',
      'Healthcare': 'Healthcare'
    };

    return sectorMappings[cleanSector] || cleanSector;
  }

  // Try Finnhub API first (most reliable for real-time data)
  private async fetchFromFinnhub(symbol: string): Promise<StockQuote | null> {
    try {
      // Check if API key is available and not 'demo'
      if (!this.FINNHUB_API_KEY || this.FINNHUB_API_KEY === 'demo') {
        console.log(`Finnhub API key not configured for ${symbol}`);
        return null;
      }

      // Get quote
      const quoteUrl = `${this.API_SOURCES.FINNHUB}/quote?symbol=${symbol}&token=${this.FINNHUB_API_KEY}`;
      const quoteResponse = await this.customFetch(quoteUrl);

      if (!quoteResponse.ok) {
        if (quoteResponse.status === 401) {
          console.log(`Finnhub API authentication failed for ${symbol} - check API key`);
        } else {
          console.log(`Finnhub quote API error for ${symbol}: ${quoteResponse.status}`);
        }
        return null;
      }

      const quoteData = await quoteResponse.json();

      // Get company profile for name, sector, and exchange
      const profileUrl = `${this.API_SOURCES.FINNHUB}/stock/profile2?symbol=${symbol}&token=${this.FINNHUB_API_KEY}`;
      const profileResponse = await this.customFetch(profileUrl);

      let companyName = symbol;
      let sector = this.SECTORS[symbol] || 'Unknown';
      let exchange = '';
      let currency = 'USD';

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        companyName = profileData.name || symbol;

        // Try multiple fields for sector/industry information with validation
        const potentialSectors = [
          profileData.finnhubIndustry,
          profileData.gics,
          profileData.gsector,
          profileData.gsubIndustry
        ];

        for (const potentialSector of potentialSectors) {
          const validatedSector = this.validateSector(potentialSector);
          if (validatedSector) {
            sector = validatedSector;
            break;
          }
        }

        // Fallback to hardcoded mapping if no valid sector found
        if (sector === 'Unknown' && this.SECTORS[symbol]) {
          sector = this.SECTORS[symbol];
        }

        exchange = profileData.exchange || '';
        currency = profileData.currency || 'USD';

        console.log(`Finnhub profile data for ${symbol}:`, {
          exchange: profileData.exchange,
          currency: profileData.currency,
          country: profileData.country,
          name: profileData.name,
          finnhubIndustry: profileData.finnhubIndustry,
          gics: profileData.gics,
          gsector: profileData.gsector,
          gsubIndustry: profileData.gsubIndustry,
          finalSector: sector
        });

        if (sector && sector !== 'Unknown') {
          console.log(`✅ Finnhub sector for ${symbol}: ${sector}`);
        }
      }

      if (quoteData.c && quoteData.c > 0) {
        return {
          symbol,
          price: quoteData.c, // current price
          change: quoteData.d, // change
          changePercent: quoteData.dp, // change percent
          companyName,
          sector,
          exchange,
          currency,
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
      // Check if API key is available and not 'demo'
      if (!this.FMP_API_KEY || this.FMP_API_KEY === 'demo') {
        console.log(`FMP API key not configured for ${symbol}`);
        return null;
      }

      // Get quote data
      const quoteUrl = `${this.API_SOURCES.FMP}/quote/${symbol}?apikey=${this.FMP_API_KEY}`;
      const quoteResponse = await this.customFetch(quoteUrl);

      if (!quoteResponse.ok) {
        if (quoteResponse.status === 401) {
          console.log(`FMP API authentication failed for ${symbol} - check API key`);
        } else {
          console.log(`FMP quote API error for ${symbol}: ${quoteResponse.status}`);
        }
        return null;
      }

      const quoteData = await quoteResponse.json();

      if (quoteData && quoteData.length > 0) {
        const quote = quoteData[0];

        // Try to get company profile for sector information
        let sector = this.SECTORS[symbol] || 'Unknown';
        let exchange = '';

        try {
          const profileUrl = `${this.API_SOURCES.FMP}/profile/${symbol}?apikey=${this.FMP_API_KEY}`;
          const profileResponse = await this.customFetch(profileUrl);

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData && profileData.length > 0) {
              const profile = profileData[0];

              // Try to extract sector from profile
              const validatedSector = this.validateSector(profile.sector || profile.industry);
              if (validatedSector) {
                sector = validatedSector;
                console.log(`✅ FMP sector for ${symbol}: ${sector}`);
              }

              exchange = profile.exchange || '';

              console.log(`FMP profile data for ${symbol}:`, {
                sector: profile.sector,
                industry: profile.industry,
                exchange: profile.exchange,
                finalSector: sector
              });
            }
          }
        } catch (profileError) {
          console.log(`FMP profile fetch failed for ${symbol}:`, profileError);
        }

        return {
          symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changesPercentage,
          companyName: quote.name || this.COMPANY_NAMES[symbol] || symbol,
          sector: sector,
          exchange: exchange,
          currency: 'USD', // FMP primarily covers US stocks
          lastUpdated: new Date()
        };
      }

      return null;
    } catch (error) {
      console.log(`FMP API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Fetch sector information from Yahoo Finance
  private async fetchSectorFromYahoo(symbol: string, targetExchange?: string): Promise<string | null> {
    try {
      // Format symbol based on target exchange
      let formattedSymbol = symbol;

      if (targetExchange === 'NSE') {
        formattedSymbol = `${symbol}.NS`;
      } else if (targetExchange === 'BSE') {
        formattedSymbol = `${symbol}.BO`;
      } else if (targetExchange === 'NYSE' || targetExchange === 'NASDAQ') {
        formattedSymbol = symbol;
      }

      // Try Yahoo Finance quoteSummary API for detailed company info
      const quoteSummaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${formattedSymbol}?modules=assetProfile,summaryProfile`;
      const response = await this.customFetch(quoteSummaryUrl);

      if (response.ok) {
        const data = await response.json();
        const assetProfile = data.quoteSummary?.result?.[0]?.assetProfile;
        const summaryProfile = data.quoteSummary?.result?.[0]?.summaryProfile;

        // Try different fields for sector information
        const sector = assetProfile?.sector ||
                      summaryProfile?.sector ||
                      assetProfile?.industry ||
                      summaryProfile?.industry;

        if (sector && sector !== 'N/A') {
          console.log(`✅ Yahoo Finance sector for ${symbol}: ${sector}`);
          return sector;
        }
      }

      return null;
    } catch (error) {
      console.log(`Yahoo Finance sector fetch failed for ${symbol}:`, error);
      return null;
    }
  }

  // Try Yahoo Finance API (free, no API key required)
  private async fetchFromYahoo(symbol: string, targetExchange?: string): Promise<StockQuote | null> {
    try {
      // Format symbol based on target exchange
      let formattedSymbol = symbol;

      if (targetExchange === 'NSE') {
        // For Indian stocks on NSE, use .NS suffix
        formattedSymbol = `${symbol}.NS`;
      } else if (targetExchange === 'BSE') {
        // For BSE, use .BO suffix
        formattedSymbol = `${symbol}.BO`;
      } else if (targetExchange === 'NYSE' || targetExchange === 'NASDAQ') {
        // For US exchanges, use symbol as-is
        formattedSymbol = symbol;
      }
      // Default: use symbol as-is

      const url = `${this.API_SOURCES.YAHOO_FINANCE}/${formattedSymbol}`;
      const response = await this.customFetch(url);

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();
      const chart = data.chart?.result?.[0];

      if (chart) {
        const meta = chart.meta;
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose;

        // Extract exchange information from metadata with better mapping
        const exchangeName = meta.exchangeName || meta.fullExchangeName || '';
        const exchangeTimezoneName = meta.exchangeTimezoneName || '';
        const currency = meta.currency || '';

        // Map Yahoo Finance exchange codes to proper exchange names
        let mappedExchange = exchangeName;
        switch (exchangeName.toUpperCase()) {
          case 'NMS':
            mappedExchange = 'NASDAQ';
            break;
          case 'NYQ':
            mappedExchange = 'NYSE';
            break;
          case 'NSI':
            mappedExchange = 'NSE';
            break;
          case 'BOM':
            mappedExchange = 'BSE';
            break;
          case 'NGM':
            mappedExchange = 'NASDAQ Global Market';
            break;
          case 'NCM':
            mappedExchange = 'NASDAQ Capital Market';
            break;
          default:
            mappedExchange = exchangeName;
        }

        console.log(`Yahoo Finance metadata for ${formattedSymbol}:`, {
          exchangeName,
          mappedExchange,
          exchangeTimezoneName,
          currency,
          symbol: meta.symbol
        });

        // Validate that we have valid price data
        if (currentPrice === undefined || currentPrice === null ||
            previousClose === undefined || previousClose === null ||
            isNaN(currentPrice) || isNaN(previousClose)) {
          console.log(`Invalid price data from Yahoo Finance for ${formattedSymbol}: price=${currentPrice}, previousClose=${previousClose}`);
          return null;
        }

        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        // Try to get sector information dynamically
        let sector = this.SECTORS[symbol] || 'Unknown';
        try {
          const dynamicSector = await this.fetchSectorFromYahoo(symbol, targetExchange);
          if (dynamicSector) {
            sector = dynamicSector;
          }
        } catch (error) {
          console.log(`Failed to fetch dynamic sector for ${symbol}:`, error);
        }

        return {
          symbol,
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          companyName: meta.longName || this.COMPANY_NAMES[symbol] || symbol,
          sector: sector,
          lastUpdated: new Date(),
          // Add exchange information to the response with proper mapping
          exchange: mappedExchange,
          currency: currency,
          exchangeTimezoneName: exchangeTimezoneName
        };
      }

      return null;
    } catch (error) {
      console.log(`Yahoo Finance API failed for ${symbol}:`, error);
      return null;
    }
  }

  // Try Google Finance API (good for international stocks, especially Indian)
  private async fetchFromGoogle(symbol: string, targetExchange?: string): Promise<StockQuote | null> {
    try {
      // Check if this is an Indian stock or if we're targeting Indian exchange
      const isIndianStock = this.INDIAN_STOCKS.hasOwnProperty(symbol);
      const shouldFetchFromIndianExchange = targetExchange === 'NSE' || targetExchange === 'BSE' || isIndianStock;
      
      if (shouldFetchFromIndianExchange) {
        console.log(`Attempting Google Finance for Indian stock: ${symbol}`);
        
        // For Indian stocks, try Yahoo Finance with appropriate exchange suffix
        const exchangeSuffix = targetExchange === 'BSE' ? '.BO' : '.NS';
        const exchangeSymbol = `${symbol}${exchangeSuffix}`;
        
        try {
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${exchangeSymbol}`;
          const response = await this.customFetch(yahooUrl);
          
          if (response.ok) {
            const data = await response.json();
            const chart = data.chart?.result?.[0];
            
            if (chart) {
              const meta = chart.meta;
              const currentPrice = meta.regularMarketPrice;
              const previousClose = meta.previousClose;
              const change = currentPrice - previousClose;
              const changePercent = (change / previousClose) * 100;
              
              console.log(`✅ Google Finance (via Yahoo ${targetExchange || 'NSE'}) provided data for ${symbol}`);
              
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
          const response = await this.customFetch(yahooUrl);
          
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
      const response = await this.customFetch(url);
      
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
      if (!this.IEX_CLOUD_KEY || this.IEX_CLOUD_KEY.trim() === '') {
        console.log(`IEX Cloud API key not configured for ${symbol}`);
        return null;
      }

      const url = `${this.API_SOURCES.IEX_CLOUD}/stock/${symbol}/quote?token=${this.IEX_CLOUD_KEY}`;
      const response = await this.customFetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          console.log(`IEX Cloud API authentication failed for ${symbol} - check API key`);
        } else if (response.status === 404) {
          console.log(`IEX Cloud: Symbol ${symbol} not found`);
        } else {
          console.log(`IEX Cloud API error for ${symbol}: ${response.status}`);
        }
        return null;
      }

      const data = await response.json();

      if (data.latestPrice) {
        console.log(`IEX Cloud data for ${symbol}:`, {
          primaryExchange: data.primaryExchange,
          calculationPrice: data.calculationPrice,
          companyName: data.companyName,
          sector: data.sector
        });

        // Validate and clean sector from IEX Cloud
        let sector = this.validateSector(data.sector);

        // Fallback to hardcoded mapping if no valid sector found
        if (!sector && this.SECTORS[symbol]) {
          sector = this.SECTORS[symbol];
        }

        if (!sector) {
          sector = 'Unknown';
        }

        if (sector && sector !== 'Unknown') {
          console.log(`✅ IEX Cloud sector for ${symbol}: ${sector}`);
        }

        return {
          symbol,
          price: data.latestPrice,
          change: data.change || 0,
          changePercent: (data.changePercent || 0) * 100, // IEX returns decimal
          companyName: data.companyName || this.COMPANY_NAMES[symbol] || symbol,
          sector: sector,
          exchange: data.primaryExchange || '',
          currency: 'USD', // IEX Cloud primarily covers US stocks
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
      const response = await this.customFetch(url);
      
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

  // Return stored data from stocks.json when real-time data is unavailable
  private async generateFallbackData(symbol: string): Promise<StockQuote> {
    try {
      // Try to get stored data from stocks.json
      const storedInfo = await this.getStoredStockInfo(symbol);
      if (storedInfo && storedInfo.lastPrice > 0) {
        console.log(`Using stored price for ${symbol}: $${storedInfo.lastPrice} (last updated: ${storedInfo.lastUpdated})`);
        
        // Calculate estimated daily change based on time since last update
        const lastUpdateTime = new Date(storedInfo.lastUpdated);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // If data is from today, check if we already have daily change for today
        let estimatedChange = 0;
        let estimatedChangePercent = 0;
        
        if (hoursSinceUpdate < 24) {
          // Check if we already have daily change calculated for today
          if (storedInfo.dailyChangeDate === today && storedInfo.dailyChange !== undefined) {
            // Use existing daily change for consistency
            estimatedChange = storedInfo.dailyChange;
            estimatedChangePercent = storedInfo.dailyChangePercent || 0;
          } else {
            // Generate deterministic daily change based on symbol and current date
            // This ensures consistency across different calls on the same day
            const seed = this.hashCode(symbol + today);
            const volatility = this.seededRandom(seed) * 0.02 - 0.01; // Between -1% and +1%
            estimatedChange = storedInfo.lastPrice * volatility;
            estimatedChangePercent = volatility * 100;
            
            // Store the daily change for consistency
            console.log(`Storing daily change for ${symbol}: ${estimatedChange} (${estimatedChangePercent}%)`);
            await this.updateDailyChangeForStock(symbol, estimatedChange, estimatedChangePercent, today);
          }
        }
        
        const bestSector = await this.getBestSector(symbol);

        return {
          symbol,
          price: storedInfo.lastPrice,
          change: estimatedChange,
          changePercent: estimatedChangePercent,
          companyName: storedInfo.companyName || this.COMPANY_NAMES[symbol] || symbol,
          sector: bestSector,
          lastUpdated: new Date(storedInfo.lastUpdated)
        };
      }
    } catch (error) {
      console.log(`Failed to get stored data for ${symbol}:`, error);
    }

    // If no stored data available, return N/A data
    const bestSector = await this.getBestSector(symbol);

    return {
      symbol,
      price: 0, // Will be displayed as "N/A" in UI
      change: 0,
      changePercent: 0,
      companyName: this.COMPANY_NAMES[symbol] || symbol,
      sector: bestSector,
      lastUpdated: new Date()
    };
  }

  // Main method to get stock quote with comprehensive fallback chain
  async getStockQuote(symbol: string, portfolioContext?: { country?: string; currency?: string } | null, forceRefresh: boolean = false): Promise<MarketDataResponse> {
    try {
      // Determine the appropriate exchange for the symbol
      let targetExchange = await this.getStockExchange(symbol); // Get actual exchange for the stock

      if (portfolioContext) {
        if (portfolioContext.country === 'India' || portfolioContext.currency === 'INR') {
          // For Indian portfolios, use Indian exchanges if it's an Indian stock
          if (await this.isIndianStock(symbol)) {
            targetExchange = await this.getStockExchange(symbol); // NSE or BSE
          }
        } else if (portfolioContext.country === 'USA' || portfolioContext.currency === 'USD') {
          // For US portfolios, always try to use US exchanges first
          if (await this.isIndianStock(symbol)) {
            // For Indian stocks in US portfolio, try to get US listing first
            // Many Indian companies like INFY trade on NASDAQ as ADRs
            const usExchange = await this.getUSExchangeForSymbol(symbol);
            if (usExchange) {
              targetExchange = usExchange;
            } else {
              // If no US listing, use Indian exchange
              targetExchange = await this.getStockExchange(symbol); // NSE or BSE
            }
          } else {
            targetExchange = await this.getStockExchange(symbol); // NYSE, NASDAQ, etc.
          }
        }
      } else {
        // If no context provided, use the stock's primary exchange
        targetExchange = await this.getStockExchange(symbol);
      }

      // Check cache first with exchange context
      const cachedData = this.getCachedData(symbol, targetExchange);
      if (cachedData && !forceRefresh) {
        return { success: true, data: cachedData };
      }

      // If not forcing refresh, try to get stored data from stocks.json first
      if (!forceRefresh) {
        try {
          const storedData = await this.generateFallbackData(symbol);
          if (storedData && storedData.price > 0) {
            console.log(`📚 Using cached data from stocks.json for ${symbol}: $${storedData.price}`);
            // Cache the stored data for future requests
            this.setCachedData(symbol, storedData, targetExchange);
            return { success: true, data: storedData };
          }
        } catch (error) {
          console.log(`⚠️ No valid stored data found for ${symbol}, will fetch from APIs`);
        }
      }

      logMarket(`Fetching real-time data from multiple sources`, symbol);
      if (portfolioContext) {
        console.log(`Portfolio context: ${portfolioContext.country}/${portfolioContext.currency} -> targeting ${targetExchange}`);
      } else {
        console.log(`No portfolio context -> using primary exchange ${targetExchange} for ${symbol}`);
      }

      // Smart fallback strategy: prioritize APIs with best sector data
      const apiMethods = [
        { name: 'Finnhub', method: () => this.fetchFromFinnhub(symbol), priority: 1 },
        { name: 'IEX Cloud', method: () => this.fetchFromIEX(symbol), priority: 2 },
        { name: 'FMP', method: () => this.fetchFromFMP(symbol), priority: 3 },
        { name: 'Yahoo Finance', method: () => this.fetchFromYahoo(symbol, targetExchange), priority: 4 },
        { name: 'Alpha Vantage', method: () => this.fetchFromAlphaVantage(symbol), priority: 5 },
        { name: 'Google Finance', method: () => this.fetchFromGoogle(symbol, targetExchange), priority: 6 },
        { name: 'Polygon', method: () => this.fetchFromPolygon(symbol), priority: 7 }
      ];

      let stockData: StockQuote | null = null;

      // Try all APIs in parallel with 2-second timeout
      console.log(`Trying all APIs in parallel for ${symbol}...`);
      try {
        const apiPromises = apiMethods.map(async (api) => {
          try {
            // Add timeout wrapper to each API call
            const timeoutPromise = new Promise<StockQuote | null>((_, reject) =>
              setTimeout(() => reject(new Error(`${api.name} timeout`)), 2000)
            );

            const dataPromise = api.method();
            const result = await Promise.race([dataPromise, timeoutPromise]);

            if (result) {
              console.log(`✅ ${api.name} successfully provided data for ${symbol}`);
              return { api: api.name, data: result };
            }
            return null;
          } catch (error) {
            console.log(`❌ ${api.name} failed for ${symbol}:`, error);
            return null;
          }
        });

        // Wait for the first successful response or all to fail
        const results = await Promise.allSettled(apiPromises);

        // Find the first successful result
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value && result.value.data) {
            stockData = result.value.data;
            console.log(`🎯 Using data from ${result.value.api} for ${symbol}`);
            break;
          }
        }
      } catch (error) {
        console.log(`❌ All parallel API calls failed for ${symbol}:`, error);
      }

      // If all APIs fail, try to get stored data from stocks.json
      if (!stockData) {
        console.log(`⚠️  All APIs failed for ${symbol}, trying stored data from stocks.json`);
        stockData = await this.generateFallbackData(symbol);
      }

      // Cache the result with exchange context
      this.setCachedData(symbol, stockData, targetExchange);

      // Store stock information in database (async, don't wait for it)
      if (stockData && stockData.price !== 0) {
        this.updateStockInfo(stockData).catch(error => {
          console.log(`Failed to store stock info for ${symbol}:`, error);
        });
      }

      return { success: true, data: stockData };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      
      // Return fallback data on error
      const fallbackData = await this.generateFallbackData(symbol);
      return { success: true, data: fallbackData };
    }
  }

  // Get quotes for multiple symbols
  async getMultipleQuotes(symbols: string[], forceRefresh: boolean = false): Promise<Record<string, StockQuote>> {
    const results: Record<string, StockQuote> = {};
    
    // First, check both in-memory cache AND stocks.json for all symbols (unless forcing refresh)
    const uncachedSymbols: string[] = [];
    for (const symbol of symbols) {
      let foundCachedData = false;

      // Check in-memory cache first
      const cachedData = this.getCachedData(symbol);
      if (cachedData && !forceRefresh) {
        results[symbol] = cachedData;
        foundCachedData = true;
        console.log(`📱 Using in-memory cache for ${symbol}`);
      }
      // If not in memory cache and not forcing refresh, check stocks.json
      else if (!forceRefresh) {
        try {
          const storedData = await this.generateFallbackData(symbol);
          if (storedData && storedData.price > 0) {
            results[symbol] = storedData;
            foundCachedData = true;
            // Also cache in memory for subsequent requests
            this.setCachedData(symbol, storedData);
            console.log(`📚 Using stocks.json cache for ${symbol}: $${storedData.price}`);
          }
        } catch (error) {
          console.log(`⚠️ No valid stored data found for ${symbol} in stocks.json`);
        }
      }

      if (!foundCachedData) {
        uncachedSymbols.push(symbol);
      }
    }

    // Only fetch data for uncached symbols (or all symbols if forcing refresh)
    if (uncachedSymbols.length === 0) {
      logPerf(`All ${symbols.length} symbols loaded from cache - no API calls needed`, 0, 'MarketDataService');
      return results;
    }

    if (forceRefresh) {
      logMarket(`Force refreshing market data for ${uncachedSymbols.length} symbols from external APIs`);
    } else {
      logPerf(`Fetching market data for ${uncachedSymbols.length} uncached symbols out of ${symbols.length} total symbols`, undefined, 'MarketDataService');
    }
    
    // Process uncached symbols in parallel but limit concurrency to avoid rate limits
    const batchSize = 10; // Increased from 3 for better performance while respecting rate limits
    for (let i = 0; i < uncachedSymbols.length; i += batchSize) {
      const batch = uncachedSymbols.slice(i, i + batchSize);
      const promises = batch.map(async (symbol) => {
        // Check if there's already a pending request for this symbol
        const existingRequest = this.pendingRequests.get(symbol);
        if (existingRequest) {
          return existingRequest;
        }
        
        // Create new request and store it to avoid duplicates
        const request = this.getStockQuote(symbol, null, forceRefresh);
        this.pendingRequests.set(symbol, request);
        
        try {
          const result = await request;
          if (result.success && result.data) {
            results[symbol] = result.data;
          }
          return result;
        } finally {
          // Clean up the pending request
          this.pendingRequests.delete(symbol);
        }
      });
      
      await Promise.all(promises);
      
      // Add small delay between batches to be respectful to APIs
      if (i + batchSize < uncachedSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay for better performance
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
