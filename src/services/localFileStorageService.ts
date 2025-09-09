import { Portfolio, Transaction, Holding } from '@/types/portfolio';
import { marketDataService } from './marketDataService';
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

import currencyConverter from './currencyConverter';

interface Settings {
  general: {
    baseCurrency: string;
    refreshInterval: number;
    timezone: string;
  };
  portfolios: {
    [key: string]: {
      baseCurrency: string;
      targetCash: number;
      rebalanceThreshold: number;
    };
  };
  sheets: {
    spreadsheetId: string;
    transactionsSheet: string;
    settingsSheet: string;
    portfoliosSheet: string;
  };
  notifications: {
    emailAlerts: boolean;
    priceAlerts: boolean;
    rebalanceAlerts: boolean;
    transactionAlerts: boolean;
  };
  lastUpdated: string;
}

interface StoredData {
  portfolios: Portfolio[];
  cashPositions: Record<string, number>;
  transactions: Transaction[];
  settings: Settings;
  userActions: UserAction[];
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

  // Simple sector mapping - in a real app, this would come from a market data API
  private getSectorForTicker(ticker: string): string {
    const sectorMap: Record<string, string> = {
      // US Technology stocks
      'NVDA': 'Technology',
      'MSFT': 'Technology', 
      'APPL': 'Technology',
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'META': 'Technology',
      'AMD': 'Technology',
      'INTC': 'Technology',
      'CRM': 'Technology',
      'ORCL': 'Technology',
      'ADBE': 'Technology',
      // US Consumer & Others
      'AMZN': 'Consumer Discretionary',
      'TSLA': 'Consumer Discretionary',
      'NFLX': 'Communication Services',
      'DIS': 'Communication Services',
      // Indian Technology stocks  
      'TCS': 'Information Technology',
      'INFY': 'Information Technology',
      'WIPRO': 'Information Technology', 
      'HCLTECH': 'Information Technology',
      'TECHM': 'Information Technology',
      // Indian Financial Services
      'HDFC': 'Financial Services',
      'HDFCBANK': 'Financial Services',
      'ICICIBANK': 'Financial Services',
      'SBIN': 'Financial Services',
      'KOTAKBANK': 'Financial Services',
      // Indian Energy & Consumer
      'RELIANCE': 'Energy',
      'ITC': 'Consumer Staples',
      'HINDUNILVR': 'Consumer Staples',
      'BHARTIARTL': 'Communication Services'
    };
    
    return sectorMap[ticker.toUpperCase()] || 'Other';
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
      portfolios: [],
      transactions: [],
      cashPositions: {},
      settings: {
        general: {
          baseCurrency: 'USD',
          refreshInterval: 5,
          timezone: 'America/New_York'
        },
        portfolios: {},
        sheets: {
          spreadsheetId: '',
          transactionsSheet: 'Transactions',
          settingsSheet: 'Settings',
          portfoliosSheet: 'Portfolios'
        },
        notifications: {
          emailAlerts: true,
          priceAlerts: true,
          rebalanceAlerts: true,
          transactionAlerts: true
        },
        lastUpdated: new Date().toISOString()
      },
      userActions: []
    };
  }

  private async getStoredData(): Promise<StoredData> {
    const [portfolios, transactions, settings, cashPositions] = await Promise.all([
      this.readJsonFile<Portfolio[]>(STORAGE_FILES.PORTFOLIOS, this.getDefaultData().portfolios),
      this.readJsonFile<Transaction[]>(STORAGE_FILES.TRANSACTIONS, []),
      this.readJsonFile(STORAGE_FILES.SETTINGS, this.getDefaultData().settings),
      this.readJsonFile<Record<string, number>>(STORAGE_FILES.CASH_POSITIONS, this.getDefaultData().cashPositions)
    ]);

    const userActions = await this.readJsonFile<UserAction[]>(STORAGE_FILES.USER_ACTIONS, []);
    return { portfolios, transactions, settings, cashPositions, userActions };
  }

  async getPortfolios(): Promise<Portfolio[]> {
    const data = await this.getStoredData();
    return data.portfolios;
  }

  async getTransactions(): Promise<Transaction[]> {
    const data = await this.getStoredData();
    return data.transactions;
  }

  async getSettings(): Promise<Settings> {
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

    // Validate transaction against available cash for BUY orders
    if (transaction.action === 'BUY') {
      const cashPositions = await this.getCashPositions();
      const availableCash = cashPositions[transaction.portfolioId] || 0;
      const transactionValue = transaction.quantity * transaction.tradePrice + transaction.fees;
      
      if (transactionValue > availableCash) {
        throw new Error(`Insufficient cash. Available: ${availableCash}, Required: ${transactionValue}`);
      }
      
      // Update cash position after purchase
      const newCashPosition = availableCash - transactionValue;
      await this.updateCashPosition(transaction.portfolioId, newCashPosition);
    } else if (transaction.action === 'SELL') {
      // For SELL orders, add cash back
      const cashPositions = await this.getCashPositions();
      const currentCash = cashPositions[transaction.portfolioId] || 0;
      const transactionValue = transaction.quantity * transaction.tradePrice - transaction.fees;
      const newCashPosition = currentCash + transactionValue;
      await this.updateCashPosition(transaction.portfolioId, newCashPosition);
    }

    const transactions = await this.getTransactions();
    transactions.push(newTransaction);
    await this.writeJsonFile(STORAGE_FILES.TRANSACTIONS, transactions);
    
    // Update portfolio totals
    await this.updatePortfolioTotals(transaction.portfolioId);
    
    // Log user action
    await this.logUserAction('ADD_TRANSACTION', newTransaction as unknown as Record<string, unknown>);

    return newTransaction;
  }

  async updateCashPosition(portfolioId: string, amount: number): Promise<void> {
    // Update cash-positions.json
    const cashPositions = await this.getCashPositions();
    cashPositions[portfolioId] = amount;
    await this.writeJsonFile(STORAGE_FILES.CASH_POSITIONS, cashPositions);
    
    // Update portfolios.json to keep cashPosition in sync
    const portfolios = await this.getPortfolios();
    const portfolioIndex = portfolios.findIndex(p => p.id === portfolioId);
    if (portfolioIndex !== -1) {
      portfolios[portfolioIndex] = {
        ...portfolios[portfolioIndex],
        cashPosition: amount,
        updatedAt: new Date()
      };
      await this.writeJsonFile(STORAGE_FILES.PORTFOLIOS, portfolios);
    }
    
    // Log user action
    await this.logUserAction('UPDATE_CASH_POSITION', { portfolioId, amount });
  }

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    const currentSettings = await this.getSettings();
    
    // Check if base currency is changing
    const oldBaseCurrency = currentSettings.general.baseCurrency;
    const newBaseCurrency = settings.general?.baseCurrency;
    
    if (newBaseCurrency && oldBaseCurrency !== newBaseCurrency) {
      // Convert all cash positions to the new base currency
      await this.convertCashPositionsToNewCurrency(oldBaseCurrency, newBaseCurrency);
    }
    
    const updatedSettings: Settings = {
      ...currentSettings,
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    await this.writeJsonFile(STORAGE_FILES.SETTINGS, updatedSettings);
    
    // Log user action
    await this.logUserAction('UPDATE_SETTINGS', settings);
  }

  async syncPortfoliosCashPositions(): Promise<void> {
    const cashPositions = await this.getCashPositions();
    const portfolios = await this.getPortfolios();
    
    let hasChanges = false;
    const updatedPortfolios = portfolios.map(portfolio => {
      const realCashPosition = cashPositions[portfolio.id];
      if (realCashPosition !== undefined && portfolio.cashPosition !== realCashPosition) {
        hasChanges = true;
        return {
          ...portfolio,
          cashPosition: realCashPosition,
          updatedAt: new Date()
        };
      }
      return portfolio;
    });
    
    if (hasChanges) {
      await this.writeJsonFile(STORAGE_FILES.PORTFOLIOS, updatedPortfolios);
      console.log('Synchronized cash positions between portfolios.json and cash-positions.json');
    }
  }

  private async convertCashPositionsToNewCurrency(fromCurrency: string, toCurrency: string): Promise<void> {
    try {
      const cashPositions = await this.getCashPositions();
      const portfolios = await this.getPortfolios();
      
      // IMPORTANT: Individual portfolios should keep their native currencies.
      // Dashboard currency changes should only affect dashboard display, not portfolio data.
      // Cash positions should remain in their original portfolio currencies.
      
      console.log(`Dashboard base currency changed: ${fromCurrency} → ${toCurrency}`);
      console.log('Note: Individual portfolio currencies and data remain unchanged.');
      console.log('Only dashboard aggregation will use the new base currency for display.');
      
      // No actual data conversion needed - the dashboard will handle conversion at display time
    } catch (error) {
      console.error('Error in currency conversion process:', error);
      throw new Error(`Failed to process currency change from ${fromCurrency} to ${toCurrency}: ${error}`);
    }
  }

  async createPortfolio(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Promise<Portfolio> {
    // Automatically set currency based on country
    const portfolioService = (await import('./portfolioService')).portfolioService;
    const autoCurrency = portfolioService.getCountryCurrency(portfolio.country);
    
    const newPortfolio: Portfolio = {
      ...portfolio,
      currency: autoCurrency, // Override any provided currency with country-based currency
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

  async updatePortfolioTotals(portfolioId: string): Promise<void> {
    try {
      const portfolios = await this.getPortfolios();
      const transactions = await this.getTransactions();
      const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolioId);
      
      const portfolio = portfolios.find(p => p.id === portfolioId);
      if (!portfolio) return;

      // Calculate totals from transactions
      let totalInvested = 0;
      let totalCurrentValue = 0;
      
      const holdings = await this.calculateHoldings(portfolioId);
      
      holdings.forEach(holding => {
        totalInvested += holding.investedValue;
        totalCurrentValue += holding.currentValue;
      });

      // Update portfolio with calculated values
      const updatedPortfolio = {
        ...portfolio,
        totalInvested,
        currentValue: totalCurrentValue,
        unrealizedPL: totalCurrentValue - totalInvested,
        totalReturn: totalCurrentValue - totalInvested,
        totalReturnPercent: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0,
        updatedAt: new Date()
      };

      // Update portfolios array
      const updatedPortfolios = portfolios.map(p => 
        p.id === portfolioId ? updatedPortfolio : p
      );

      await this.writeJsonFile(STORAGE_FILES.PORTFOLIOS, updatedPortfolios);
    } catch (error) {
      console.error('Error updating portfolio totals:', error);
    }
  }

  // Calculate realized P&L from completed transactions
  async calculateRealizedPL(portfolioId?: string): Promise<number> {
    const transactions = await this.getTransactions();
    const relevantTransactions = portfolioId ? 
      transactions.filter(t => t.portfolioId === portfolioId) : 
      transactions;
    
    const tickerPositions = new Map<string, { buyPrices: number[], quantities: number[] }>();
    let totalRealizedPL = 0;

    // Process transactions chronologically using FIFO method
    relevantTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(transaction => {
        const key = `${transaction.portfolioId}_${transaction.ticker}`;
        
        if (transaction.action === 'BUY') {
          if (!tickerPositions.has(key)) {
            tickerPositions.set(key, { buyPrices: [], quantities: [] });
          }
          const position = tickerPositions.get(key)!;
          position.buyPrices.push(transaction.tradePrice);
          position.quantities.push(transaction.quantity);
        } else if (transaction.action === 'SELL') {
          const position = tickerPositions.get(key);
          if (position) {
            let remainingSellQuantity = transaction.quantity;
            
            // Use FIFO to determine cost basis for sold shares
            while (remainingSellQuantity > 0 && position.quantities.length > 0) {
              const firstBuyQuantity = position.quantities[0];
              const firstBuyPrice = position.buyPrices[0];
              
              const quantityToSell = Math.min(remainingSellQuantity, firstBuyQuantity);
              const costBasis = quantityToSell * firstBuyPrice;
              const saleProceeds = quantityToSell * transaction.tradePrice;
              const realizedPL = saleProceeds - costBasis - transaction.fees;
              
              totalRealizedPL += realizedPL;
              
              // Update remaining quantity in first buy
              position.quantities[0] -= quantityToSell;
              remainingSellQuantity -= quantityToSell;
              
              // Remove completed buy orders
              if (position.quantities[0] <= 0) {
                position.quantities.shift();
                position.buyPrices.shift();
              }
            }
          }
        }
      });

    return totalRealizedPL;
  }

  // Calculate holdings from transactions with real market data
  async calculateHoldings(portfolioId: string, useRealTimeData: boolean = true): Promise<Holding[]> {
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
          sector: this.getSectorForTicker(transaction.ticker),
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

    // Get all holdings and fetch real market data if requested
    const holdings = Array.from(holdingsMap.values());
    
    if (useRealTimeData && holdings.length > 0) {
      try {
        console.log(`Fetching real-time market data for ${holdings.length} holdings...`);
        const symbols = holdings.map(h => h.ticker);
        const marketData = await marketDataService.getMultipleQuotes(symbols);
        
        // Update holdings with real market data
        holdings.forEach(holding => {
          const quote = marketData[holding.ticker];
          if (quote) {
            holding.currentPrice = quote.price;
            holding.currentValue = holding.quantity * quote.price;
            holding.unrealizedPL = holding.currentValue - holding.investedValue;
            holding.unrealizedPLPercent = holding.investedValue > 0 ? (holding.unrealizedPL / holding.investedValue) * 100 : 0;
            holding.dailyChange = quote.change * holding.quantity;
            holding.dailyChangePercent = quote.changePercent;
            holding.name = quote.companyName || holding.ticker;
            holding.sector = quote.sector || this.getSectorForTicker(holding.ticker);
            
            console.log(`Updated ${holding.ticker}: $${quote.price} (${quote.changePercent.toFixed(2)}%)`);
          } else {
            console.warn(`No market data found for ${holding.ticker}, using average buy price`);
          }
        });
      } catch (error) {
        console.error('Error fetching market data, using fallback prices:', error);
      }
    }
    
    // Recalculate total portfolio value after market data updates
    const totalPortfolioValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
    
    // Update allocation percentages
    holdings.forEach(holding => {
      holding.allocation = totalPortfolioValue > 0 ? (holding.currentValue / totalPortfolioValue) * 100 : 0;
    });

    return holdings.map(({ totalCost: _, ...holding }) => holding);
  }
}

export const localFileStorageService = new LocalFileStorageService();
