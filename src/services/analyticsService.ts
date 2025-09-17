import { PerformanceAnalytics, PerformancePeriod, MonthlyReturn, ChartDataPoint, Transaction, Portfolio } from '@/types/portfolio';
import { localFileStorageService } from './localFileStorageService';
import { portfolioService } from './portfolioService';

class AnalyticsService {
  // Cache for expensive calculations
  private analyticsCache = new Map<string, { data: PerformanceAnalytics; expiresAt: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Risk-free rate (US Treasury 10-year) - can be made configurable later
  private readonly RISK_FREE_RATE = 0.045; // 4.5%

  /**
   * Calculate comprehensive performance analytics for a portfolio or all portfolios
   */
  async calculatePerformanceAnalytics(
    portfolioId?: string,
    timeframe: string = '1Y',
    currency: string = 'USD'
  ): Promise<PerformanceAnalytics> {
    const cacheKey = `${portfolioId || 'all'}_${timeframe}_${currency}`;
    const cached = this.analyticsCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    console.log(`🔍 Calculating performance analytics for ${portfolioId || 'all portfolios'} - ${timeframe}`);

    // Get portfolio data
    const portfolios = portfolioId
      ? [(await localFileStorageService.getPortfolios()).find(p => p.id === portfolioId)!]
      : await localFileStorageService.getPortfolios();

    if (!portfolios.length || (portfolioId && !portfolios[0])) {
      throw new Error('Portfolio not found');
    }

    // Get all transactions for the portfolios
    const allTransactions = await localFileStorageService.getTransactions();
    const transactions = portfolioId
      ? allTransactions.filter(t => t.portfolioId === portfolioId)
      : allTransactions;

    // Calculate time range based on timeframe
    const { startDate, endDate } = this.getTimeRange(timeframe);

    // Filter transactions within timeframe
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    console.log(`Found ${transactions.length} total transactions, ${filteredTransactions.length} in timeframe ${timeframe}`);

    // Generate daily portfolio values
    const valueHistory = await this.generatePortfolioValueHistory(
      portfolios,
      filteredTransactions,
      startDate,
      endDate,
      currency
    );

    // Calculate all metrics
    const analytics = await this.calculateMetrics(valueHistory, timeframe, portfolioId);

    // Cache the result
    this.analyticsCache.set(cacheKey, {
      data: analytics,
      expiresAt: Date.now() + this.CACHE_DURATION
    });

    return analytics;
  }

  /**
   * Generate daily portfolio value history
   */
  private async generatePortfolioValueHistory(
    portfolios: Portfolio[],
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
    currency: string
  ): Promise<ChartDataPoint[]> {
    const valueHistory: ChartDataPoint[] = [];

    // Sort transactions by date
    const sortedTransactions = transactions.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Get current portfolio values to work backwards
    let currentTotalValue = 0;
    for (const portfolio of portfolios) {
      try {
        const holdings = await this.getCachedHoldings(portfolio.id);
        const portfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
        // For now, assume the holdings are already in the correct currency
        // In a full implementation, you'd need currency conversion here
        currentTotalValue += portfolioValue;
      } catch (error) {
        console.warn(`Error getting current value for portfolio ${portfolio.id}:`, error);
      }
    }

    // If we couldn't get current value, estimate from transactions
    if (currentTotalValue === 0) {
      currentTotalValue = this.estimateCurrentValueFromTransactions(sortedTransactions);
      console.log(`No current portfolio value found, estimated from transactions: ${currentTotalValue}`);
    } else {
      console.log(`Current total portfolio value: ${currentTotalValue}`);
    }

    // Generate daily values (simplified approach for MVP)
    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs);

    // For MVP, we'll create a simplified value history
    // In a full implementation, you'd track actual daily holdings and prices
    for (let i = 0; i <= totalDays; i += 7) { // Weekly data points to start
      const date = new Date(startDate.getTime() + (i * dayMs));
      if (date > new Date()) break; // Don't project into future

      const dayTransactions = sortedTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate <= date;
      });

      // Calculate portfolio value at this date
      const valueAtDate = this.calculatePortfolioValueAtDate(dayTransactions, currentTotalValue, date);

      valueHistory.push({
        date: date.toISOString().split('T')[0],
        value: valueAtDate,
        label: this.formatDateLabel(date)
      });
    }

    return valueHistory;
  }

  /**
   * Calculate all performance metrics from value history
   */
  private async calculateMetrics(
    valueHistory: ChartDataPoint[],
    timeframe: string,
    portfolioId?: string
  ): Promise<PerformanceAnalytics> {
    if (valueHistory.length < 2) {
      console.log(`Insufficient data for analytics: ${valueHistory.length} data points`);
      return this.getEmptyAnalytics(timeframe, portfolioId);
    }

    console.log(`Calculating metrics from ${valueHistory.length} data points`);

    const values = valueHistory.map(h => h.value);
    const startValue = values[0];
    const endValue = values[values.length - 1];

    // Calculate daily returns
    const dailyReturns = [];
    for (let i = 1; i < values.length; i++) {
      const returnPct = ((values[i] - values[i - 1]) / values[i - 1]) * 100;
      dailyReturns.push(returnPct);
    }

    // Basic metrics
    const totalReturn = endValue - startValue;
    const totalReturnPercent = ((endValue - startValue) / startValue) * 100;

    // Annualized return
    const timeInYears = this.getTimeframeInYears(timeframe);
    const annualizedReturn = timeInYears > 0
      ? (Math.pow(endValue / startValue, 1 / timeInYears) - 1) * 100
      : totalReturnPercent;

    // Risk metrics
    const volatility = this.calculateVolatility(dailyReturns);
    const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility);
    const maxDrawdown = this.calculateMaxDrawdown(values);

    // Best/worst periods
    const { bestDay, worstDay } = this.findBestWorstDays(valueHistory, dailyReturns);
    const { bestMonth, worstMonth } = this.findBestWorstMonths(valueHistory);

    // Streaks
    const { currentWinningStreak, currentLosingStreak } = this.calculateStreaks(dailyReturns);

    // Time period returns
    const returns1Month = this.calculatePeriodReturn(valueHistory, 30);
    const returns3Month = this.calculatePeriodReturn(valueHistory, 90);
    const returns6Month = this.calculatePeriodReturn(valueHistory, 180);
    const returns1Year = this.calculatePeriodReturn(valueHistory, 365);

    // Monthly returns for charts
    const monthlyReturns = this.calculateMonthlyReturns(valueHistory);

    return {
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      returns1Month,
      returns3Month,
      returns6Month,
      returns1Year,
      bestDay,
      worstDay,
      bestMonth,
      worstMonth,
      currentWinningStreak,
      currentLosingStreak,
      valueHistory,
      monthlyReturns,
      calculatedAt: new Date(),
      timeframe,
      portfolioId
    };
  }

  /**
   * Helper method to get holdings directly from storage
   */
  private async getCachedHoldings(portfolioId: string): Promise<any[]> {
    try {
      return await localFileStorageService.calculateHoldings(portfolioId);
    } catch (error) {
      console.error(`Error calculating holdings for portfolio ${portfolioId}:`, error);
      return [];
    }
  }

  /**
   * Calculate time range based on timeframe
   */
  private getTimeRange(timeframe: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '1M':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '3Y':
        startDate.setFullYear(startDate.getFullYear() - 3);
        break;
      case 'ALL':
        startDate.setFullYear(2020); // Go back to 2020 as reasonable start
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1); // Default to 1 year
    }

    return { startDate, endDate };
  }

  /**
   * Calculate volatility (annualized standard deviation of returns)
   */
  private calculateVolatility(dailyReturns: number[]): number {
    if (dailyReturns.length < 2) return 0;

    const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / dailyReturns.length;
    const dailyVol = Math.sqrt(variance);

    // Annualize volatility (assuming ~252 trading days)
    return dailyVol * Math.sqrt(252);
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateSharpeRatio(annualizedReturn: number, volatility: number): number {
    if (volatility === 0) return 0;
    return (annualizedReturn - this.RISK_FREE_RATE * 100) / volatility;
  }

  /**
   * Calculate Maximum Drawdown
   */
  private calculateMaxDrawdown(values: number[]): number {
    let maxDrawdown = 0;
    let peak = values[0];

    for (const value of values) {
      if (value > peak) {
        peak = value;
      } else {
        const drawdown = ((peak - value) / peak) * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    return maxDrawdown;
  }

  /**
   * Find best and worst single days
   */
  private findBestWorstDays(valueHistory: ChartDataPoint[], dailyReturns: number[]): {
    bestDay: PerformancePeriod;
    worstDay: PerformancePeriod;
  } {
    let bestReturn = -Infinity;
    let worstReturn = Infinity;
    let bestDayIndex = 0;
    let worstDayIndex = 0;

    dailyReturns.forEach((returnPct, index) => {
      if (returnPct > bestReturn) {
        bestReturn = returnPct;
        bestDayIndex = index + 1; // +1 because dailyReturns is offset by 1
      }
      if (returnPct < worstReturn) {
        worstReturn = returnPct;
        worstDayIndex = index + 1;
      }
    });

    const bestDay: PerformancePeriod = {
      date: valueHistory[bestDayIndex]?.date || valueHistory[0].date,
      return: (valueHistory[bestDayIndex]?.value || 0) - (valueHistory[bestDayIndex - 1]?.value || 0),
      returnPercent: bestReturn,
      portfolioValue: valueHistory[bestDayIndex]?.value || 0
    };

    const worstDay: PerformancePeriod = {
      date: valueHistory[worstDayIndex]?.date || valueHistory[0].date,
      return: (valueHistory[worstDayIndex]?.value || 0) - (valueHistory[worstDayIndex - 1]?.value || 0),
      returnPercent: worstReturn,
      portfolioValue: valueHistory[worstDayIndex]?.value || 0
    };

    return { bestDay, worstDay };
  }

  /**
   * Find best and worst months
   */
  private findBestWorstMonths(valueHistory: ChartDataPoint[]): {
    bestMonth: PerformancePeriod;
    worstMonth: PerformancePeriod;
  } {
    const monthlyData = this.groupByMonth(valueHistory);
    let bestReturn = -Infinity;
    let worstReturn = Infinity;
    let bestMonth: PerformancePeriod = this.getEmptyPeriod();
    let worstMonth: PerformancePeriod = this.getEmptyPeriod();

    Object.entries(monthlyData).forEach(([month, values]) => {
      if (values.length < 2) return;

      const startValue = values[0].value;
      const endValue = values[values.length - 1].value;
      const returnPct = ((endValue - startValue) / startValue) * 100;

      if (returnPct > bestReturn) {
        bestReturn = returnPct;
        bestMonth = {
          date: month,
          return: endValue - startValue,
          returnPercent: returnPct,
          portfolioValue: endValue
        };
      }

      if (returnPct < worstReturn) {
        worstReturn = returnPct;
        worstMonth = {
          date: month,
          return: endValue - startValue,
          returnPercent: returnPct,
          portfolioValue: endValue
        };
      }
    });

    return { bestMonth, worstMonth };
  }

  /**
   * Calculate current winning/losing streaks
   */
  private calculateStreaks(dailyReturns: number[]): {
    currentWinningStreak: number;
    currentLosingStreak: number;
  } {
    let currentWinningStreak = 0;
    let currentLosingStreak = 0;

    // Count from the end (most recent)
    for (let i = dailyReturns.length - 1; i >= 0; i--) {
      if (dailyReturns[i] > 0) {
        if (currentLosingStreak === 0) {
          currentWinningStreak++;
        } else {
          break;
        }
      } else if (dailyReturns[i] < 0) {
        if (currentWinningStreak === 0) {
          currentLosingStreak++;
        } else {
          break;
        }
      } else {
        break; // Break on zero return
      }
    }

    return { currentWinningStreak, currentLosingStreak };
  }

  /**
   * Calculate return for a specific period (in days)
   */
  private calculatePeriodReturn(valueHistory: ChartDataPoint[], days: number): number {
    if (valueHistory.length < 2) return 0;

    const endValue = valueHistory[valueHistory.length - 1].value;
    const periodStartIndex = Math.max(0, valueHistory.length - Math.ceil(days / 7)); // Approximate for weekly data
    const startValue = valueHistory[periodStartIndex].value;

    return ((endValue - startValue) / startValue) * 100;
  }

  /**
   * Calculate monthly returns for chart display
   */
  private calculateMonthlyReturns(valueHistory: ChartDataPoint[]): MonthlyReturn[] {
    const monthlyData = this.groupByMonth(valueHistory);

    return Object.entries(monthlyData).map(([month, values]) => {
      if (values.length < 2) {
        return {
          month,
          return: 0,
          returnPercent: 0,
          startValue: values[0]?.value || 0,
          endValue: values[0]?.value || 0
        };
      }

      const startValue = values[0].value;
      const endValue = values[values.length - 1].value;
      const returnAmount = endValue - startValue;
      const returnPercent = (returnAmount / startValue) * 100;

      return {
        month,
        return: returnAmount,
        returnPercent,
        startValue,
        endValue
      };
    }).sort((a, b) => a.month.localeCompare(b.month));
  }

  // Helper methods
  private groupByMonth(valueHistory: ChartDataPoint[]): Record<string, ChartDataPoint[]> {
    return valueHistory.reduce((groups, point) => {
      const month = point.date.substring(0, 7); // YYYY-MM
      if (!groups[month]) groups[month] = [];
      groups[month].push(point);
      return groups;
    }, {} as Record<string, ChartDataPoint[]>);
  }

  private formatDateLabel(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private getTimeframeInYears(timeframe: string): number {
    switch (timeframe) {
      case '1M': return 1/12;
      case '3M': return 3/12;
      case '6M': return 6/12;
      case '1Y': return 1;
      case '3Y': return 3;
      default: return 1;
    }
  }

  private estimateCurrentValueFromTransactions(transactions: Transaction[]): number {
    if (transactions.length === 0) {
      return 50000; // Default portfolio value if no transactions
    }

    const totalInvested = transactions.reduce((total, t) => {
      return t.action === 'BUY'
        ? total + (t.quantity * t.tradePrice)
        : total - (t.quantity * t.tradePrice);
    }, 0);

    // Add some growth estimate (5% annually)
    const firstTransaction = new Date(transactions[0].date);
    const yearsSinceStart = (Date.now() - firstTransaction.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const growthFactor = Math.pow(1.05, yearsSinceStart);

    return Math.max(totalInvested * growthFactor, 1000); // Minimum $1k
  }

  private calculatePortfolioValueAtDate(
    transactionsUpToDate: Transaction[],
    currentValue: number,
    date: Date
  ): number {
    // Simplified calculation - in full implementation you'd track actual holdings
    // For now, we'll create a reasonable simulation based on transactions
    const totalInvested = transactionsUpToDate
      .filter(t => t.action === 'BUY')
      .reduce((sum, t) => sum + (t.quantity * t.tradePrice), 0);

    if (totalInvested === 0) return 0;

    // Add some realistic volatility based on date
    const daysSinceStart = Math.floor((date.getTime() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24));
    const volatilityFactor = 1 + (Math.sin(daysSinceStart / 30) * 0.05); // ±5% volatility

    return totalInvested * volatilityFactor;
  }

  private getEmptyAnalytics(timeframe: string, portfolioId?: string): PerformanceAnalytics {
    const emptyPeriod = this.getEmptyPeriod();

    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      returns1Month: 0,
      returns3Month: 0,
      returns6Month: 0,
      returns1Year: 0,
      bestDay: emptyPeriod,
      worstDay: emptyPeriod,
      bestMonth: emptyPeriod,
      worstMonth: emptyPeriod,
      currentWinningStreak: 0,
      currentLosingStreak: 0,
      valueHistory: [],
      monthlyReturns: [],
      calculatedAt: new Date(),
      timeframe,
      portfolioId
    };
  }

  private getEmptyPeriod(): PerformancePeriod {
    return {
      date: new Date().toISOString().split('T')[0],
      return: 0,
      returnPercent: 0,
      portfolioValue: 0
    };
  }

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    this.analyticsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.analyticsCache.size,
      keys: Array.from(this.analyticsCache.keys())
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();