import { Portfolio, Transaction, DashboardData, Holding, AllocationItem } from '@/types/portfolio';
import { apiStorageService } from './apiStorageService';
import { realTimeCurrencyService } from './realTimeCurrencyService';
import { Logger, logCache, logPerf, logPortfolio, logError } from '@/lib/logger';

// Fallback exchange rates (updated September 2025)
const FALLBACK_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1, INR: 88.23, EUR: 0.90, GBP: 0.76 },
  INR: { USD: 0.012, INR: 1, EUR: 0.0102, GBP: 0.0088 },
  EUR: { USD: 1.18, INR: 98.35, EUR: 1, GBP: 0.86 },
  GBP: { USD: 1.37, INR: 113.89, EUR: 1.16, GBP: 1 }
};

// Country to currency mapping - automatic currency based on country
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'USA': 'USD',
  'United States': 'USD',
  'US': 'USD',
  'India': 'INR',
  'IN': 'INR',
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'GB': 'GBP',
  'Germany': 'EUR',
  'France': 'EUR',
  'Spain': 'EUR',
  'Italy': 'EUR',
  'Netherlands': 'EUR',
  'Europe': 'EUR',
  'EU': 'EUR'
};

class PortfolioService {
  // Cache for expensive holdings calculations
  private holdingsCache = new Map<string, { data: any[]; expiresAt: number }>();
  private dashboardCache = new Map<string, { data: DashboardData; expiresAt: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for better performance

  // Get currency for a country automatically
  getCountryCurrency(country: string): string {
    return COUNTRY_CURRENCY_MAP[country] || 'USD'; // Default to USD if country not found
  }

  // Cache portfolio holdings for performance
  private async getCachedHoldings(portfolioId: string): Promise<any[]> {
    const cacheKey = portfolioId;
    const cached = this.holdingsCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      logCache('holdings', portfolioId, true);
      return cached.data;
    }

    const startTime = Date.now();
    try {
      logCache('holdings', portfolioId, false);
      const response = await fetch(`/api/holdings?portfolioId=${portfolioId}`);
      const holdings = response.ok ? await response.json() : [];

      // Cache the result
      this.holdingsCache.set(cacheKey, {
        data: holdings,
        expiresAt: Date.now() + this.CACHE_DURATION
      });

      const duration = Date.now() - startTime;
      logPerf(`Holdings fetched for portfolio ${portfolioId}`, duration, 'PortfolioService');
      return holdings;
    } catch (error) {
      logError(`Error fetching holdings for portfolio ${portfolioId}`, error, 'PortfolioService');
      return [];
    }
  }

  // Cache dashboard data for performance
  private getCachedDashboardData(currency: string): DashboardData | null {
    const cacheKey = `dashboard_${currency}`;
    const cached = this.dashboardCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      logCache('dashboard', currency, true);
      return cached.data;
    }

    return null;
  }

  private setCachedDashboardData(currency: string, data: DashboardData): void {
    const cacheKey = `dashboard_${currency}`;
    this.dashboardCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.CACHE_DURATION
    });
    logCache('dashboard', currency, false);
  }
  async getDashboardData(currency = 'USD'): Promise<DashboardData> {
    const startTime = Date.now();
    logPortfolio(`Starting dashboard data calculation`, `currency=${currency}`);

    // Check cache first
    const cachedData = this.getCachedDashboardData(currency);
    if (cachedData) {
      const duration = Date.now() - startTime;
      logPerf(`Dashboard data served from cache`, duration, 'PortfolioService');
      return cachedData;
    }

    // Get all portfolios and their holdings
    const portfolios = await apiStorageService.getPortfolios();
    const cashPositions = await apiStorageService.getCashPositions();

    // Batch all holdings requests in parallel using cached method
    const holdingsPromises = portfolios.map(portfolio => this.getCachedHoldings(portfolio.id));

    // Execute all holdings requests in parallel
    const allPortfolioHoldings = await Promise.all(holdingsPromises);
    const allUnconvertedHoldings: Holding[] = [];

    // Collect all holdings to determine needed exchange rates
    allPortfolioHoldings.forEach(holdings => {
      allUnconvertedHoldings.push(...holdings);
    });

    // Batch fetch all needed exchange rates upfront for better performance
    const ratesStartTime = Date.now();
    const exchangeRates = await this.batchFetchExchangeRates(portfolios, allUnconvertedHoldings, currency);
    const ratesDuration = Date.now() - ratesStartTime;
    logPerf(`Batch fetched ${Object.keys(exchangeRates).length} exchange rates`, ratesDuration, 'PortfolioService');

    const allHoldings: Holding[] = [];
    
    let totalCashPosition = 0;
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalUnrealizedPL = 0;
    let totalDailyChange = 0;

    // Calculate total realized P&L across all portfolios with currency conversion
    let totalRealizedPL = 0;
    const realizedPLPromises = portfolios.map(async (portfolio) => {
      try {
        const portfolioRealizedPL = await apiStorageService.calculateRealizedPL(portfolio.id);
        // Convert portfolio's realized P&L to target currency using batched rate
        const rateKey = `${portfolio.currency}_${currency}`;
        const rate = exchangeRates[rateKey] || 1;
        return portfolioRealizedPL * rate;
      } catch (error) {
        console.error(`Error calculating realized P&L for portfolio ${portfolio.id}:`, error);
        return 0;
      }
    });
    
    // Execute all realized P&L calculations in parallel
    const realizedPLResults = await Promise.all(realizedPLPromises);
    totalRealizedPL = realizedPLResults.reduce((sum, pl) => sum + pl, 0);

    // Process portfolio metrics in parallel
    const portfolioMetricsPromises = portfolios.map(async (portfolio, index) => {
      const holdings = allPortfolioHoldings[index];

      // Convert holdings to target currency using batched exchange rates
      const convertedHoldings = holdings.map((holding: Holding) => {
        const rateKey = `${holding.currency}_${currency}`;
        const rate = exchangeRates[rateKey] || 1;
        return {
          ...holding,
          avgBuyPrice: holding.avgBuyPrice * rate,
          currentPrice: holding.currentPrice * rate,
          currentValue: holding.currentValue * rate,
          investedValue: holding.investedValue * rate,
          unrealizedPL: holding.unrealizedPL * rate,
          dailyChange: holding.dailyChange * rate,
          currency: currency // Update currency to target currency
        };
      });

      allHoldings.push(...convertedHoldings);

      // Convert cash position to target currency using batched exchange rate
      const portfolioRateKey = `${portfolio.currency}_${currency}`;
      const portfolioRate = exchangeRates[portfolioRateKey] || 1;
      const convertedCashPosition = (cashPositions[portfolio.id] || 0) * portfolioRate;
      
      // Calculate portfolio totals from converted holdings (already converted above)
      const portfolioInvested = convertedHoldings.reduce((sum: number, h: Holding) => sum + h.investedValue, 0);
      const portfolioCurrentValue = convertedHoldings.reduce((sum: number, h: Holding) => sum + h.currentValue, 0);
      const portfolioUnrealizedPL = convertedHoldings.reduce((sum: number, h: Holding) => sum + h.unrealizedPL, 0);
      const portfolioDailyChange = convertedHoldings.reduce((sum: number, h: Holding) => sum + h.dailyChange, 0);

      return {
        cashPosition: convertedCashPosition,
        invested: portfolioInvested,
        currentValue: portfolioCurrentValue,
        unrealizedPL: portfolioUnrealizedPL,
        dailyChange: portfolioDailyChange
      };
    });
    
    // Execute all portfolio metrics calculations in parallel
    const portfolioMetrics = await Promise.all(portfolioMetricsPromises);
    
    // Aggregate totals
    portfolioMetrics.forEach(metrics => {
      totalCashPosition += metrics.cashPosition;
      totalInvested += metrics.invested;
      totalCurrentValue += metrics.currentValue;
      totalUnrealizedPL += metrics.unrealizedPL;
      totalDailyChange += metrics.dailyChange;
    });

    const totalPL = totalUnrealizedPL + totalRealizedPL;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    
    // Calculate daily change percentage correctly:
    // Daily change % = (daily change amount / previous day's portfolio value) * 100
    // Previous day's value = current value - daily change
    const previousDayValue = totalCurrentValue - totalDailyChange;
    const dailyChangePercent = previousDayValue > 0 ? (totalDailyChange / previousDayValue) * 100 : 0;

    // Create allocations - pass portfolio metrics for accurate calculation
    const portfolioAllocations = this.calculatePortfolioAllocations(portfolios, portfolioMetrics, currency);
    const sectorAllocations = this.calculateSectorAllocations(allHoldings, totalCashPosition);
    const countryAllocations = this.calculateCountryAllocations(allHoldings);
    const currencyAllocations = this.calculateCurrencyAllocations(allHoldings);

    // Get top holdings (top 10)
    const topHoldings = allHoldings
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 10);

    const dashboardData = {
      totalInvested,
      totalCurrentValue,
      totalCashPosition,
      totalPL,
      totalPLPercent,
      totalUnrealizedPL,
      totalRealizedPL,
      dailyChange: totalDailyChange,
      dailyChangePercent,
      xirr: 15.5, // Mock XIRR calculation
      availableCashPosition: totalCashPosition * 0.9, // 90% available
      allocations: portfolioAllocations,
      sectorAllocations,
      countryAllocations,
      currencyAllocations,
      topHoldings,
      topGainers: topHoldings.filter(h => h.unrealizedPLPercent > 0).slice(0, 5),
      topLosers: topHoldings.filter(h => h.unrealizedPLPercent < 0).slice(0, 5),
      lastUpdated: new Date().toISOString()
    };

    // Cache the result
    this.setCachedDashboardData(currency, dashboardData);

    const totalDuration = Date.now() - startTime;
    logPerf(`Dashboard data calculation completed`, totalDuration, 'PortfolioService');
    logPortfolio(`Dashboard includes ${topHoldings.length} holdings, ${portfolios.length} portfolios`, `currency=${currency}`);

    return dashboardData;
  }

  async getPortfolioData(portfolioId: string, currency = 'USD'): Promise<{ portfolio: Portfolio; holdings: Holding[] }> {
    const portfolios = await apiStorageService.getPortfolios();
    const portfolio = portfolios.find((p: Portfolio) => p.id === portfolioId);
    
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    // For now, return empty holdings array until we implement holdings calculation in API
    const holdings: Holding[] = [];

    // Convert holdings to target currency
    const convertedHoldings = holdings.map(holding => {
      const rate = this.getExchangeRate(holding.currency, currency);
      return {
        ...holding,
        currentValue: holding.currentValue * rate,
        investedValue: holding.investedValue * rate,
        unrealizedPL: holding.unrealizedPL * rate,
        dailyChange: holding.dailyChange * rate
      };
    });

    return { portfolio, holdings: convertedHoldings };
  }

  async getPortfolios(): Promise<Portfolio[]> {
    return apiStorageService.getPortfolios();
  }

  async getTransactions(portfolioId?: string): Promise<Transaction[]> {
    const transactions = await apiStorageService.getTransactions();
    return portfolioId ? transactions.filter(t => t.portfolioId === portfolioId) : transactions;
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    return apiStorageService.addTransaction(transaction);
  }

  async updateCashPosition(portfolioId: string, newCashPosition: number): Promise<void> {
    await apiStorageService.updateCashPosition(portfolioId, newCashPosition);
  }

  getExchangeRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return 1;
    return FALLBACK_EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
  }

  // Cache for batched exchange rates
  private exchangeRateBatch: Map<string, Promise<number>> = new Map();

  async getExchangeRateAsync(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const cacheKey = `${fromCurrency}_${toCurrency}`;

    // Check if we already have a pending request for this rate
    if (this.exchangeRateBatch.has(cacheKey)) {
      return this.exchangeRateBatch.get(cacheKey)!;
    }

    // Create the promise and cache it
    const ratePromise = this.fetchExchangeRate(fromCurrency, toCurrency);
    this.exchangeRateBatch.set(cacheKey, ratePromise);

    // Clean up the cache after 1 second to prevent memory leaks
    setTimeout(() => {
      this.exchangeRateBatch.delete(cacheKey);
    }, 1000);

    return ratePromise;
  }

  // Batch fetch multiple exchange rates for better performance
  async batchFetchExchangeRates(portfolios: Portfolio[], allHoldings: Holding[], targetCurrency: string): Promise<Record<string, number>> {
    // Collect all unique currency pairs needed
    const uniquePairs = new Set<string>();

    // Add portfolio currencies
    portfolios.forEach(portfolio => {
      if (portfolio.currency !== targetCurrency) {
        uniquePairs.add(`${portfolio.currency}_${targetCurrency}`);
      }
    });

    // Add holding currencies
    allHoldings.forEach(holding => {
      if (holding.currency !== targetCurrency) {
        uniquePairs.add(`${holding.currency}_${targetCurrency}`);
      }
    });

    // If no conversions needed, return empty object
    if (uniquePairs.size === 0) {
      return {};
    }

    // Batch fetch all rates in parallel
    const ratePromises = Array.from(uniquePairs).map(async (pair) => {
      const [fromCurrency, toCurrency] = pair.split('_');
      const rate = await this.getExchangeRateAsync(fromCurrency, toCurrency);
      return [pair, rate] as [string, number];
    });

    const rateResults = await Promise.all(ratePromises);

    // Convert to object for easy lookup
    return Object.fromEntries(rateResults);
  }

  private async fetchExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      // Use real-time currency service
      const rate = await realTimeCurrencyService.getExchangeRate(fromCurrency, toCurrency);
      Logger.debug(`Exchange rate fetched: ${fromCurrency} to ${toCurrency} = ${rate}`, null, 'PortfolioService');
      return rate;
    } catch (error) {
      Logger.warn(`Failed to get real-time rate for ${fromCurrency} to ${toCurrency}, using fallback`, 'PortfolioService');
      logError(`Exchange rate API error`, error, 'PortfolioService');
      // Fallback to hardcoded rates
      const fallbackRate = FALLBACK_EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
      Logger.info(`Using fallback rate: ${fromCurrency} to ${toCurrency} = ${fallbackRate}`, 'PortfolioService');
      return fallbackRate;
    }
  }

  private calculatePortfolioAllocations(
    portfolios: Portfolio[],
    portfolioMetrics: Array<{cashPosition: number; invested: number; currentValue: number; unrealizedPL: number; dailyChange: number}>,
    targetCurrency: string
  ): AllocationItem[] {
    // Calculate total portfolio value including cash positions
    const totalValue = portfolioMetrics.reduce((sum, metrics) => {
      return sum + metrics.currentValue + metrics.cashPosition;
    }, 0);

    return portfolios.map((portfolio, index) => {
      const metrics = portfolioMetrics[index];
      // Portfolio value = holdings value + cash position
      const portfolioValue = metrics.currentValue + metrics.cashPosition;

      return {
        name: portfolio.name,
        value: portfolioValue,
        percentage: totalValue > 0 ? (portfolioValue / totalValue) * 100 : 0
      };
    });
  }

  private calculateSectorAllocations(holdings: Holding[], totalCashPosition: number = 0): AllocationItem[] {
    const sectorMap = new Map<string, number>();
    let holdingsTotal = 0;

    holdings.forEach(holding => {
      const sector = holding.sector || 'Other';
      const current = sectorMap.get(sector) || 0;
      sectorMap.set(sector, current + holding.currentValue);
      holdingsTotal += holding.currentValue;
    });

    // Add cash as a separate allocation if there's cash position
    if (totalCashPosition > 0) {
      sectorMap.set('Cash', totalCashPosition);
    }

    const total = holdingsTotal + totalCashPosition;

    return Array.from(sectorMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    }));
  }

  private calculateCountryAllocations(holdings: Holding[]): AllocationItem[] {
    const countryMap = new Map<string, number>();
    let total = 0;

    holdings.forEach(holding => {
      const current = countryMap.get(holding.country) || 0;
      countryMap.set(holding.country, current + holding.currentValue);
      total += holding.currentValue;
    });

    return Array.from(countryMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    }));
  }

  private calculateCurrencyAllocations(holdings: Holding[]): AllocationItem[] {
    const currencyMap = new Map<string, number>();
    let total = 0;

    holdings.forEach(holding => {
      const current = currencyMap.get(holding.currency) || 0;
      currencyMap.set(holding.currency, current + holding.currentValue);
      total += holding.currentValue;
    });

    return Array.from(currencyMap.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    }));
  }
}

export const portfolioService = new PortfolioService();
