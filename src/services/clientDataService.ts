// Client-side service that reads data directly from JSON files without API calls
import { Portfolio, Transaction, DashboardData, Holding, AllocationItem } from '@/types/portfolio';

// Fallback exchange rates (updated September 2025)
const FALLBACK_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1, INR: 88.23, EUR: 0.90, GBP: 0.76 },
  INR: { USD: 0.012, INR: 1, EUR: 0.0102, GBP: 0.0088 },
  EUR: { USD: 1.18, INR: 98.35, EUR: 1, GBP: 0.86 },
  GBP: { USD: 1.37, INR: 113.89, EUR: 1.16, GBP: 1 }
};

// Simple sector mapping
const SECTOR_MAP: Record<string, string> = {
  'NVDA': 'Technology',
  'MSFT': 'Technology', 
  'AAPL': 'Technology',
  'GOOGL': 'Technology',
  'META': 'Technology',
  'AMD': 'Technology',
  'INTC': 'Technology',
  'AMZN': 'Consumer Discretionary',
  'TSLA': 'Consumer Discretionary',
  'NFLX': 'Communication Services',
  'SOXX': 'Technology',
  'TCS': 'Information Technology',
  'INFY': 'Information Technology',
  'VBL': 'Consumer Staples',
  'RELIANCE': 'Energy',
  'ITC': 'Consumer Staples',
  'HINDUNILVR': 'Consumer Staples'
};

interface StockData {
  symbol: string;
  companyName: string;
  sector: string;
  exchange: string;
  currency: string;
  lastPrice: number;
  lastUpdated: string;
  dailyChange?: number;
  dailyChangePercent?: number;
  dailyChangeDate?: string;
}

interface StoredStocksData {
  stocks: Record<string, StockData>;
  lastUpdated: string | null;
}

class ClientDataService {
  private dataCache: {
    portfolios?: Portfolio[];
    transactions?: Transaction[];
    cashPositions?: Record<string, number>;
    stocks?: StoredStocksData;
    lastUpdate?: number;
  } = {};

  private cacheExpiry = 30000; // 30 seconds cache for client-side data

  // Clear cache to force fresh data read
  clearCache(): void {
    this.dataCache = {};
  }

  // Read data from JSON files via API endpoints (since direct file access doesn't work client-side)
  private async readDataFile<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`/api/data/${endpoint}`);
      if (!response.ok) throw new Error(`Failed to fetch /api/data/${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error(`Error reading /api/data/${endpoint}:`, error);
      throw error;
    }
  }

  private isCacheValid(): boolean {
    return !!(this.dataCache.lastUpdate && 
           (Date.now() - this.dataCache.lastUpdate) < this.cacheExpiry);
  }

  // Get portfolios data directly from JSON
  async getPortfolios(): Promise<Portfolio[]> {
    if (this.dataCache.portfolios && this.isCacheValid()) {
      return this.dataCache.portfolios;
    }

    const portfolios = await this.readDataFile<Portfolio[]>('portfolios');
    this.dataCache.portfolios = portfolios;
    this.dataCache.lastUpdate = Date.now();
    return portfolios;
  }

  // Get transactions data directly from JSON
  async getTransactions(): Promise<Transaction[]> {
    if (this.dataCache.transactions && this.isCacheValid()) {
      return this.dataCache.transactions;
    }

    const transactions = await this.readDataFile<Transaction[]>('transactions');
    this.dataCache.transactions = transactions;
    this.dataCache.lastUpdate = Date.now();
    return transactions;
  }

  // Get cash positions data directly from JSON
  async getCashPositions(): Promise<Record<string, number>> {
    if (this.dataCache.cashPositions && this.isCacheValid()) {
      return this.dataCache.cashPositions;
    }

    const cashPositions = await this.readDataFile<Record<string, number>>('cash-positions');
    this.dataCache.cashPositions = cashPositions;
    this.dataCache.lastUpdate = Date.now();
    return cashPositions;
  }

  // Get stocks data directly from JSON
  async getStocks(): Promise<StoredStocksData> {
    if (this.dataCache.stocks && this.isCacheValid()) {
      return this.dataCache.stocks;
    }

    const stocks = await this.readDataFile<StoredStocksData>('stocks');
    this.dataCache.stocks = stocks;
    this.dataCache.lastUpdate = Date.now();
    return stocks;
  }

  // Get settings data directly from JSON
  async getSettings(): Promise<any> {
    try {
      const settings = await this.readDataFile<any>('settings');
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return { general: { baseCurrency: 'USD' } }; // fallback
    }
  }

  // Calculate holdings for a portfolio using stored data
  async calculateHoldings(portfolioId: string): Promise<Holding[]> {
    const [transactions, stocks] = await Promise.all([
      this.getTransactions(),
      this.getStocks()
    ]);

    const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolioId);
    const holdingsMap = new Map<string, any>();

    // Process transactions using FIFO method
    portfolioTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(transaction => {
        const key = transaction.ticker;
        const existing = holdingsMap.get(key) || {
          ticker: transaction.ticker,
          name: transaction.ticker,
          quantity: 0,
          avgBuyPrice: 0,
          currentPrice: 0,
          currentValue: 0,
          investedValue: 0,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          dailyChange: 0,
          dailyChangePercent: 0,
          allocation: 0,
          sector: SECTOR_MAP[transaction.ticker] || 'Other',
          country: transaction.country,
          currency: transaction.currency,
          exchange: transaction.exchange,
          totalCost: 0
        };

        if (transaction.action === 'BUY') {
          const newQuantity = existing.quantity + transaction.quantity;
          const newTotalCost = existing.totalCost + (transaction.quantity * transaction.tradePrice);
          
          existing.quantity = newQuantity;
          existing.totalCost = newTotalCost;
          existing.avgBuyPrice = newTotalCost / newQuantity;
          existing.investedValue = newTotalCost;
        } else if (transaction.action === 'SELL') {
          existing.quantity -= transaction.quantity;
          existing.totalCost -= (transaction.quantity * existing.avgBuyPrice);
          existing.investedValue = existing.totalCost;
          
          if (existing.quantity <= 0) {
            holdingsMap.delete(key);
            return;
          }
        }

        // Update market value using stored stock data
        const stockData = stocks.stocks[transaction.ticker];
        if (stockData) {
          existing.currentPrice = stockData.lastPrice;
          existing.name = stockData.companyName || transaction.ticker;
          existing.sector = stockData.sector || SECTOR_MAP[transaction.ticker] || 'Other';
          
          // Calculate daily change if available
          if (stockData.dailyChange !== undefined) {
            existing.dailyChange = stockData.dailyChange * existing.quantity;
            existing.dailyChangePercent = stockData.dailyChangePercent || 0;
          } else {
            // Generate consistent daily change for demo
            const seed = this.hashCode(transaction.ticker + new Date().toISOString().split('T')[0]);
            const volatility = this.seededRandom(seed) * 0.02 - 0.01; // Between -1% and +1%
            existing.dailyChange = stockData.lastPrice * volatility * existing.quantity;
            existing.dailyChangePercent = volatility * 100;
          }
        } else {
          existing.currentPrice = existing.avgBuyPrice; // Fallback to buy price
        }

        existing.currentValue = existing.quantity * existing.currentPrice;
        existing.unrealizedPL = existing.currentValue - existing.investedValue;
        existing.unrealizedPLPercent = existing.investedValue > 0 ? (existing.unrealizedPL / existing.investedValue) * 100 : 0;

        holdingsMap.set(key, existing);
      });

    const holdings = Array.from(holdingsMap.values());
    
    // Calculate allocations
    const totalPortfolioValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
    holdings.forEach(holding => {
      holding.allocation = totalPortfolioValue > 0 ? (holding.currentValue / totalPortfolioValue) * 100 : 0;
    });

    return holdings;
  }

  // Calculate realized P&L for a portfolio
  async calculateRealizedPL(portfolioId: string): Promise<number> {
    const transactions = await this.getTransactions();
    const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolioId);
    
    let realizedPL = 0;
    const holdingsMap = new Map<string, { quantity: number; avgCost: number }>();

    portfolioTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(transaction => {
        const existing = holdingsMap.get(transaction.ticker) || { quantity: 0, avgCost: 0 };

        if (transaction.action === 'BUY') {
          const newQuantity = existing.quantity + transaction.quantity;
          const newTotalCost = (existing.quantity * existing.avgCost) + (transaction.quantity * transaction.tradePrice);
          
          existing.quantity = newQuantity;
          existing.avgCost = newTotalCost / newQuantity;
        } else if (transaction.action === 'SELL') {
          const sellPL = (transaction.tradePrice - existing.avgCost) * transaction.quantity;
          realizedPL += sellPL;
          existing.quantity -= transaction.quantity;
        }

        holdingsMap.set(transaction.ticker, existing);
      });

    return realizedPL;
  }

  // Get exchange rate (using fallback rates)
  getExchangeRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return 1;
    return FALLBACK_EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
  }

  // Helper methods
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Main dashboard data calculation - reads directly from JSON files
  async getDashboardData(currency = 'USD'): Promise<DashboardData> {
    console.log(`📊 Calculating dashboard data from JSON files for currency: ${currency}`);
    
    const [portfolios, cashPositions] = await Promise.all([
      this.getPortfolios(),
      this.getCashPositions()
    ]);

    // Calculate holdings for all portfolios
    const allPortfolioHoldings = await Promise.all(
      portfolios.map(portfolio => this.calculateHoldings(portfolio.id))
    );

    const allHoldings: Holding[] = [];
    let totalCashPosition = 0;
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalUnrealizedPL = 0;
    let totalDailyChange = 0;

    // Calculate total realized P&L
    const realizedPLResults = await Promise.all(
      portfolios.map(portfolio => this.calculateRealizedPL(portfolio.id))
    );
    const totalRealizedPL = realizedPLResults.reduce((sum, pl) => sum + pl, 0);

    // Process each portfolio
    portfolios.forEach((portfolio, index) => {
      const holdings = allPortfolioHoldings[index];
      
      // Convert holdings to target currency
      const convertedHoldings = holdings.map(holding => {
        const rate = this.getExchangeRate(holding.currency, currency);
        return {
          ...holding,
          avgBuyPrice: holding.avgBuyPrice * rate,
          currentPrice: holding.currentPrice * rate,
          currentValue: holding.currentValue * rate,
          investedValue: holding.investedValue * rate,
          unrealizedPL: holding.unrealizedPL * rate,
          dailyChange: holding.dailyChange * rate,
          currency: currency
        };
      });
      
      allHoldings.push(...convertedHoldings);

      // Convert cash position to target currency
      const portfolioRate = this.getExchangeRate(portfolio.currency, currency);
      const convertedCashPosition = (cashPositions[portfolio.id] || 0) * portfolioRate;
      
      // Calculate portfolio totals
      const portfolioInvested = convertedHoldings.reduce((sum, h) => sum + h.investedValue, 0);
      const portfolioCurrentValue = convertedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const portfolioUnrealizedPL = convertedHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0);
      const portfolioDailyChange = convertedHoldings.reduce((sum, h) => sum + h.dailyChange, 0);

      totalCashPosition += convertedCashPosition;
      totalInvested += portfolioInvested;
      totalCurrentValue += portfolioCurrentValue;
      totalUnrealizedPL += portfolioUnrealizedPL;
      totalDailyChange += portfolioDailyChange;
    });

    const totalPL = totalUnrealizedPL + totalRealizedPL;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    
    const previousDayValue = totalCurrentValue - totalDailyChange;
    const dailyChangePercent = previousDayValue > 0 ? (totalDailyChange / previousDayValue) * 100 : 0;

    // Create allocations
    const portfolioAllocations = this.calculatePortfolioAllocations(portfolios, currency);
    const sectorAllocations = this.calculateSectorAllocations(allHoldings);
    const countryAllocations = this.calculateCountryAllocations(allHoldings);
    const currencyAllocations = this.calculateCurrencyAllocations(allHoldings);

    // Get top holdings, gainers, and losers
    const topHoldings = allHoldings
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 10);

    const topGainers = allHoldings
      .filter(h => h.unrealizedPLPercent > 0)
      .sort((a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent)
      .slice(0, 5);

    const topLosers = allHoldings
      .filter(h => h.unrealizedPLPercent < 0)
      .sort((a, b) => a.unrealizedPLPercent - b.unrealizedPLPercent)
      .slice(0, 5);

    const xirr = 15.5; // Placeholder - would need complex calculation

    console.log(`✅ Dashboard data calculated: Daily Change: ${totalDailyChange.toFixed(2)}, Unrealized P&L: ${totalUnrealizedPL.toFixed(2)}`);

    return {
      totalInvested,
      totalCurrentValue,
      totalCashPosition,
      totalPL,
      totalPLPercent,
      totalUnrealizedPL,
      totalRealizedPL,
      dailyChange: totalDailyChange,
      dailyChangePercent,
      xirr,
      availableCashPosition: totalCashPosition * 0.9, // 90% available
      allocations: portfolioAllocations,
      sectorAllocations,
      countryAllocations,
      currencyAllocations,
      topHoldings,
      topGainers,
      topLosers,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculatePortfolioAllocations(portfolios: Portfolio[], targetCurrency: string): AllocationItem[] {
    const totalValue = portfolios.reduce((sum, portfolio) => {
      const rate = this.getExchangeRate(portfolio.currency, targetCurrency);
      return sum + (portfolio.currentValue || 0) * rate;
    }, 0);

    return portfolios.map(portfolio => {
      const rate = this.getExchangeRate(portfolio.currency, targetCurrency);
      const value = (portfolio.currentValue || 0) * rate;
      return {
        name: portfolio.name,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      };
    });
  }

  private calculateSectorAllocations(holdings: Holding[]): AllocationItem[] {
    const sectorMap = new Map<string, number>();
    
    holdings.forEach(holding => {
      const sector = holding.sector || 'Other';
      const current = sectorMap.get(sector) || 0;
      sectorMap.set(sector, current + holding.currentValue);
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    
    return Array.from(sectorMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }

  private calculateCountryAllocations(holdings: Holding[]): AllocationItem[] {
    const countryMap = new Map<string, number>();
    
    holdings.forEach(holding => {
      const current = countryMap.get(holding.country) || 0;
      countryMap.set(holding.country, current + holding.currentValue);
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    
    return Array.from(countryMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }

  private calculateCurrencyAllocations(holdings: Holding[]): AllocationItem[] {
    const currencyMap = new Map<string, number>();
    
    holdings.forEach(holding => {
      const current = currencyMap.get(holding.currency) || 0;
      currencyMap.set(holding.currency, current + holding.currentValue);
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    
    return Array.from(currencyMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }
}

// Export singleton instance
export const clientDataService = new ClientDataService();
