import { Portfolio, Transaction, Holding } from '@/types/portfolio';

const STORAGE_KEYS = {
  PORTFOLIOS: 'portfolio_management_portfolios',
  TRANSACTIONS: 'portfolio_management_transactions',
  SETTINGS: 'portfolio_management_settings',
  CASH_POSITIONS: 'portfolio_management_cash_positions'
};

// Internal interface for calculations
interface HoldingCalculation extends Holding {
  totalCost: number;
}

export interface StoredData {
  portfolios: Portfolio[];
  transactions: Transaction[];
  settings: {
    baseCurrency: string;
    lastUpdated: string;
  };
  cashPositions: Record<string, number>;
}

class LocalStorageService {
  private isClient = typeof window !== 'undefined';

  private getStoredData(): StoredData {
    if (!this.isClient) {
      return this.getDefaultData();
    }

    try {
      const portfolios = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTFOLIOS) || '[]');
      const transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
      const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{"baseCurrency":"USD","lastUpdated":""}');
      const cashPositions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CASH_POSITIONS) || '{}');

      // If no data exists, return default data
      if (portfolios.length === 0) {
        return this.getDefaultData();
      }

      return {
        portfolios,
        transactions,
        settings,
        cashPositions
      };
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      return this.getDefaultData();
    }
  }

  private getDefaultData(): StoredData {
    return {
      portfolios: [
        {
          id: 'usa-alpha',
          name: 'USA Alpha Fund',
          description: 'High-growth US investments',
          currency: 'USD',
          country: 'USA',
          cashPosition: 103689.97,
          targetCashPercent: 10,
          createdAt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), // Created 1 year ago
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'usa-sip',
          name: 'USA SIP',
          description: 'Systematic Investment Plan',
          currency: 'USD',
          country: 'USA',
          cashPosition: 45000.00,
          targetCashPercent: 15,
          createdAt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), // Created 1 year ago
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'india-investments',
          name: 'India Investments',
          description: 'Indian equity investments',
          currency: 'INR',
          country: 'India',
          cashPosition: 250000.00,
          targetCashPercent: 12,
          createdAt: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), // Created 1 year ago
          lastUpdated: new Date().toISOString()
        }
      ],
      transactions: [
        {
          id: '1',
          portfolioId: 'usa-alpha',
          date: new Date('2024-09-05'),
          action: 'BUY',
          ticker: 'AAPL',
          exchange: 'NASDAQ',
          country: 'USA',
          quantity: 100,
          tradePrice: 150.00,
          currency: 'USD',
          fees: 5.00,
          notes: 'Initial purchase',
          tag: 'Growth'
        },
        {
          id: '2',
          portfolioId: 'usa-alpha',
          date: new Date('2024-09-03'),
          action: 'BUY',
          ticker: 'MSFT',
          exchange: 'NASDAQ',
          country: 'USA',
          quantity: 50,
          tradePrice: 280.00,
          currency: 'USD',
          fees: 3.50,
          notes: 'Tech position',
          tag: 'Growth'
        }
      ],
      settings: {
        baseCurrency: 'USD',
        lastUpdated: new Date().toISOString()
      },
      cashPositions: {
        'usa-alpha': 103689.97,
        'usa-sip': 45000.00,
        'india-investments': 250000.00
      }
    };
  }

  private saveData(data: Partial<StoredData>): void {
    if (!this.isClient) return;

    try {
      if (data.portfolios) {
        localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(data.portfolios));
      }
      if (data.transactions) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
      }
      if (data.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }
      if (data.cashPositions) {
        localStorage.setItem(STORAGE_KEYS.CASH_POSITIONS, JSON.stringify(data.cashPositions));
      }
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  }

  getPortfolios(): Portfolio[] {
    const data = this.getStoredData();
    return data.portfolios;
  }

  getTransactions(portfolioId?: string): Transaction[] {
    const data = this.getStoredData();
    if (portfolioId) {
      return data.transactions.filter(t => t.portfolioId === portfolioId);
    }
    return data.transactions;
  }

  addTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
    const data = this.getStoredData();
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString()
    };
    
    data.transactions.push(newTransaction);
    this.saveData({ transactions: data.transactions });
    
    return newTransaction;
  }

  updateCashPosition(portfolioId: string, newCashPosition: number): void {
    const data = this.getStoredData();
    
    // Update portfolio cash position
    const portfolio = data.portfolios.find(p => p.id === portfolioId);
    if (portfolio) {
      portfolio.cashPosition = newCashPosition;
      portfolio.lastUpdated = new Date().toISOString();
    }
    
    // Update cash positions record
    data.cashPositions[portfolioId] = newCashPosition;
    
    this.saveData({ 
      portfolios: data.portfolios, 
      cashPositions: data.cashPositions 
    });
  }

  updateSettings(settings: Partial<StoredData['settings']>): void {
    const data = this.getStoredData();
    data.settings = { ...data.settings, ...settings };
    this.saveData({ settings: data.settings });
  }

  // Calculate holdings from transactions
  calculateHoldings(portfolioId: string): Holding[] {
    const transactions = this.getTransactions(portfolioId);
    const holdingsMap: Map<string, HoldingCalculation> = new Map();

    transactions.forEach(transaction => {
      const key = transaction.ticker;
      
      if (!holdingsMap.has(key)) {
        holdingsMap.set(key, {
          ticker: transaction.ticker,
          name: this.getStockName(transaction.ticker),
          exchange: transaction.exchange,
          currency: transaction.currency,
          quantity: 0,
          avgBuyPrice: 0,
          currentPrice: this.getMockCurrentPrice(transaction.ticker),
          currentValue: 0,
          investedValue: 0,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          dailyChange: 0,
          dailyChangePercent: 0,
          allocation: 0,
          sector: this.getStockSector(transaction.ticker),
          country: this.getStockCountry(transaction.exchange),
          totalCost: 0
        });
      }

      const holding = holdingsMap.get(key)!;
      
      if (transaction.action === 'BUY') {
        const newQuantity = holding.quantity + transaction.quantity;
        const newTotalCost = holding.totalCost + (transaction.quantity * transaction.tradePrice) + (transaction.fees || 0);
        
        holding.quantity = newQuantity;
        holding.totalCost = newTotalCost;
        holding.avgBuyPrice = newTotalCost / newQuantity;
        holding.investedValue = newTotalCost;
      } else if (transaction.action === 'SELL') {
        holding.quantity -= transaction.quantity;
        // For simplicity, keeping total cost same for avg price calculation
      }
      
      // Update calculated values
      holding.currentValue = holding.quantity * holding.currentPrice;
      holding.unrealizedPL = holding.currentValue - (holding.quantity * holding.avgBuyPrice);
      holding.unrealizedPLPercent = holding.quantity > 0 ? (holding.unrealizedPL / (holding.quantity * holding.avgBuyPrice)) * 100 : 0;
      
      // Mock daily change
      holding.dailyChange = holding.currentValue * 0.002; // 0.2% daily change
      holding.dailyChangePercent = 0.2;
    });

    const holdings = Array.from(holdingsMap.values()).filter(h => h.quantity > 0);
    
    // Calculate allocations
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    holdings.forEach(holding => {
      holding.allocation = totalValue > 0 ? (holding.currentValue / totalValue) * 100 : 0;
    });

    // Convert back to Holding interface (remove totalCost)
    return holdings.map(h => ({
      ticker: h.ticker,
      name: h.name,
      exchange: h.exchange,
      currency: h.currency,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.currentPrice,
      currentValue: h.currentValue,
      investedValue: h.investedValue,
      unrealizedPL: h.unrealizedPL,
      unrealizedPLPercent: h.unrealizedPLPercent,
      dailyChange: h.dailyChange,
      dailyChangePercent: h.dailyChangePercent,
      allocation: h.allocation,
      sector: h.sector,
      country: h.country
    })).sort((a, b) => b.currentValue - a.currentValue);
  }

  private getStockName(ticker: string): string {
    const names: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'NVDA': 'NVIDIA Corporation',
      'META': 'Meta Platforms Inc.',
      'NFLX': 'Netflix Inc.'
    };
    return names[ticker] || `${ticker} Corporation`;
  }

  private getStockSector(ticker: string): string {
    const sectors: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'AMZN': 'Consumer Discretionary',
      'TSLA': 'Automotive',
      'NVDA': 'Technology',
      'META': 'Technology',
      'NFLX': 'Entertainment'
    };
    return sectors[ticker] || 'Technology';
  }

  private getStockCountry(exchange: string): string {
    const countries: Record<string, string> = {
      'NASDAQ': 'USA',
      'NYSE': 'USA',
      'NSE': 'India',
      'BSE': 'India',
      'LSE': 'UK'
    };
    return countries[exchange] || 'USA';
  }

  private getMockCurrentPrice(ticker: string): number {
    const prices: Record<string, number> = {
      'AAPL': 175.50,
      'MSFT': 310.25,
      'GOOGL': 132.80,
      'AMZN': 145.30,
      'TSLA': 238.45,
      'NVDA': 485.20,
      'META': 325.75,
      'NFLX': 445.60
    };
    return prices[ticker] || 100.00;
  }

  clearAllData(): void {
    if (!this.isClient) return;

    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const localStorageService = new LocalStorageService();
