import { Portfolio, Transaction, Holding } from '@/types/portfolio';
import fs from 'fs';
import path from 'path';

// Define storage paths
const STORAGE_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILES = {
  PORTFOLIOS: path.join(STORAGE_DIR, 'portfolios.json'),
  TRANSACTIONS: path.join(STORAGE_DIR, 'transactions.json'),
  SETTINGS: path.join(STORAGE_DIR, 'settings.json'),
  CASH_POSITIONS: path.join(STORAGE_DIR, 'cash-positions.json'),
  USER_ACTIONS: path.join(STORAGE_DIR, 'user-actions.json')
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

export interface UserAction {
  id: string;
  timestamp: string;
  action: 'ADD_TRANSACTION' | 'UPDATE_CASH_POSITION' | 'UPDATE_SETTINGS' | 'CREATE_PORTFOLIO' | 'DELETE_PORTFOLIO';
  data: Record<string, unknown>;
  userId?: string;
}

class LocalFileStorageService {
  private isServer = typeof window === 'undefined';

  constructor() {
    // Ensure data directory exists
    if (this.isServer && !fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  private async readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
    if (!this.isServer) {
      throw new Error('File operations can only be performed on the server side');
    }

    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
    return defaultValue;
  }

  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    if (!this.isServer) {
      throw new Error('File operations can only be performed on the server side');
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  private async logUserAction(action: UserAction['action'], data: Record<string, unknown>): Promise<void> {
    const userAction: UserAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      data
    };

    try {
      const existingActions = await this.readJsonFile<UserAction[]>(STORAGE_FILES.USER_ACTIONS, []);
      existingActions.push(userAction);
      
      // Keep only last 1000 actions to prevent file from getting too large
      if (existingActions.length > 1000) {
        existingActions.splice(0, existingActions.length - 1000);
      }
      
      await this.writeJsonFile(STORAGE_FILES.USER_ACTIONS, existingActions);
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  }

  private getDefaultData(): StoredData {
    return {
      portfolios: [
        {
          id: 'usa-alpha',
          name: 'USA Alpha Fund',
          description: 'High-growth US equity portfolio',
          currency: 'USD',
          cashPosition: 50000,
          totalInvested: 45000,
          currentValue: 52000,
          unrealizedPL: 7000,
          totalReturn: 7000,
          totalReturnPercent: 15.56,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'usa-sip',
          name: 'USA SIP',
          description: 'Systematic Investment Plan for US markets',
          currency: 'USD',
          cashPosition: 25000,
          totalInvested: 30000,
          currentValue: 33000,
          unrealizedPL: 3000,
          totalReturn: 3000,
          totalReturnPercent: 10.0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'india-investments',
          name: 'India Investments',
          description: 'Indian equity and debt portfolio',
          currency: 'INR',
          cashPosition: 500000,
          totalInvested: 400000,
          currentValue: 450000,
          unrealizedPL: 50000,
          totalReturn: 50000,
          totalReturnPercent: 12.5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      transactions: [],
      settings: {
        baseCurrency: 'USD',
        lastUpdated: new Date().toISOString()
      },
      cashPositions: {
        'usa-alpha': 50000,
        'usa-sip': 25000,
        'india-investments': 500000
      }
    };
  }

  private async getStoredData(): Promise<StoredData> {
    const [portfolios, transactions, settings, cashPositions] = await Promise.all([
      this.readJsonFile<Portfolio[]>(STORAGE_FILES.PORTFOLIOS, this.getDefaultData().portfolios),
      this.readJsonFile<Transaction[]>(STORAGE_FILES.TRANSACTIONS, []),
      this.readJsonFile(STORAGE_FILES.SETTINGS, this.getDefaultData().settings),
      this.readJsonFile<Record<string, number>>(STORAGE_FILES.CASH_POSITIONS, this.getDefaultData().cashPositions)
    ]);

    return { portfolios, transactions, settings, cashPositions };
  }

  async getPortfolios(): Promise<Portfolio[]> {
    const data = await this.getStoredData();
    return data.portfolios;
  }

  async getTransactions(): Promise<Transaction[]> {
    const data = await this.getStoredData();
    return data.transactions;
  }

  async getSettings(): Promise<{ baseCurrency: string; lastUpdated: string }> {
    const data = await this.getStoredData();
    return data.settings;
  }

  async getCashPositions(): Promise<Record<string, number>> {
    const data = await this.getStoredData();
    return data.cashPositions;
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTransaction: Transaction = {
      ...transaction,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const transactions = await this.getTransactions();
    transactions.push(newTransaction);
    await this.writeJsonFile(STORAGE_FILES.TRANSACTIONS, transactions);
    
    // Log user action
    await this.logUserAction('ADD_TRANSACTION', newTransaction as unknown as Record<string, unknown>);

    return newTransaction;
  }

  async updateCashPosition(portfolioId: string, amount: number): Promise<void> {
    const cashPositions = await this.getCashPositions();
    cashPositions[portfolioId] = amount;
    await this.writeJsonFile(STORAGE_FILES.CASH_POSITIONS, cashPositions);
    
    // Log user action
    await this.logUserAction('UPDATE_CASH_POSITION', { portfolioId, amount });
  }

  async updateSettings(settings: { baseCurrency: string }): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    await this.writeJsonFile(STORAGE_FILES.SETTINGS, updatedSettings);
    
    // Log user action
    await this.logUserAction('UPDATE_SETTINGS', settings);
  }

  async createPortfolio(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Promise<Portfolio> {
    const newPortfolio: Portfolio = {
      ...portfolio,
      id: `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const portfolios = await this.getPortfolios();
    portfolios.push(newPortfolio);
    await this.writeJsonFile(STORAGE_FILES.PORTFOLIOS, portfolios);
    
    // Log user action
    await this.logUserAction('CREATE_PORTFOLIO', newPortfolio as unknown as Record<string, unknown>);

    return newPortfolio;
  }

  async deletePortfolio(portfolioId: string): Promise<void> {
    const portfolios = await this.getPortfolios();
    const updatedPortfolios = portfolios.filter(p => p.id !== portfolioId);
    await this.writeJsonFile(STORAGE_FILES.PORTFOLIOS, updatedPortfolios);
    
    // Log user action
    await this.logUserAction('DELETE_PORTFOLIO', { portfolioId });
  }

  async getUserActions(): Promise<UserAction[]> {
    return await this.readJsonFile<UserAction[]>(STORAGE_FILES.USER_ACTIONS, []);
  }

  // Calculate holdings from transactions
  async calculateHoldings(portfolioId: string): Promise<Holding[]> {
    const transactions = await this.getTransactions();
    const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolioId);
    
    const holdingsMap = new Map<string, HoldingCalculation>();

    // Process transactions using FIFO method
    portfolioTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(transaction => {
        const key = transaction.ticker;
        const existing = holdingsMap.get(key) || {
          ticker: transaction.ticker,
          name: transaction.ticker, // We'd need to fetch this from an API
          quantity: 0,
          avgBuyPrice: 0,
          currentPrice: 0, // This would come from market data API
          currentValue: 0,
          investedValue: 0,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          dailyChange: 0,
          dailyChangePercent: 0,
          allocation: 0,
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

        // Update market value and P&L (using avgBuyPrice as currentPrice for now)
        existing.currentPrice = existing.avgBuyPrice; // In real app, fetch from market data API
        existing.currentValue = existing.quantity * existing.currentPrice;
        existing.unrealizedPL = existing.currentValue - existing.investedValue;
        existing.unrealizedPLPercent = existing.investedValue > 0 ? (existing.unrealizedPL / existing.investedValue) * 100 : 0;

        holdingsMap.set(key, existing);
      });

    return Array.from(holdingsMap.values()).map(({ totalCost: _, ...holding }) => holding);
  }
}

export const localFileStorageService = new LocalFileStorageService();
