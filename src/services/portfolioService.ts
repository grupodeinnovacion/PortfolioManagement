import { Portfolio, Transaction, DashboardData, Holding, AllocationItem } from '@/types/portfolio';
import { apiStorageService } from './apiStorageService';

// Currency conversion rates (mock data - in production, use real API)
const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1, INR: 83.12, EUR: 0.85, GBP: 0.73 },
  INR: { USD: 0.012, INR: 1, EUR: 0.0102, GBP: 0.0088 },
  EUR: { USD: 1.18, INR: 98.35, EUR: 1, GBP: 0.86 },
  GBP: { USD: 1.37, INR: 113.89, EUR: 1.16, GBP: 1 }
};

class PortfolioService {
  async getDashboardData(currency = 'USD'): Promise<DashboardData> {
    // Get all portfolios and their holdings
    const portfolios = await apiStorageService.getPortfolios();
    const cashPositions = await apiStorageService.getCashPositions();
    const allHoldings: Holding[] = [];
    let totalCashPosition = 0;
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalUnrealizedPL = 0;
    const totalRealizedPL = 0;
    let totalDailyChange = 0;

    // Calculate portfolio metrics
    for (const portfolio of portfolios) {
      // Note: For now, we'll calculate holdings directly here
      // In a full implementation, we'd have an API endpoint for this
      const holdings: Holding[] = [];
      allHoldings.push(...holdings);

      // Convert to target currency
      const rate = this.getExchangeRate(portfolio.currency, currency);
      totalCashPosition += (cashPositions[portfolio.id] || 0) * rate;
      
      const portfolioInvested = holdings.reduce((sum: number, h: Holding) => sum + h.investedValue, 0);
      const portfolioCurrentValue = holdings.reduce((sum: number, h: Holding) => sum + h.currentValue, 0);
      const portfolioUnrealizedPL = holdings.reduce((sum: number, h: Holding) => sum + h.unrealizedPL, 0);
      const portfolioDailyChange = holdings.reduce((sum: number, h: Holding) => sum + h.dailyChange, 0);

      totalInvested += portfolioInvested * rate;
      totalCurrentValue += portfolioCurrentValue * rate;
      totalUnrealizedPL += portfolioUnrealizedPL * rate;
      totalDailyChange += portfolioDailyChange * rate;
    }

    const totalPL = totalUnrealizedPL + totalRealizedPL;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    const dailyChangePercent = totalCurrentValue > 0 ? (totalDailyChange / totalCurrentValue) * 100 : 0;

    // Create allocations
    const portfolioAllocations = this.calculatePortfolioAllocations(portfolios, currency);
    const sectorAllocations = this.calculateSectorAllocations(allHoldings);
    const countryAllocations = this.calculateCountryAllocations(allHoldings);
    const currencyAllocations = this.calculateCurrencyAllocations(allHoldings);

    // Get top holdings (top 10)
    const topHoldings = allHoldings
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 10);

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

  private getExchangeRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return 1;
    return EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
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
    let total = 0;

    holdings.forEach(holding => {
      const sector = holding.sector || 'Other';
      const current = sectorMap.get(sector) || 0;
      sectorMap.set(sector, current + holding.currentValue);
      total += holding.currentValue;
    });

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
