import { Portfolio, Transaction } from '@/types/portfolio';
import { UserAction } from './localFileStorageService';

class ApiStorageService {
  private baseUrl = '/api';

  async getPortfolios(): Promise<Portfolio[]> {
    const response = await fetch(`${this.baseUrl}/portfolios`);
    if (!response.ok) {
      throw new Error('Failed to fetch portfolios');
    }
    return response.json();
  }

  async createPortfolio(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Promise<Portfolio> {
    const response = await fetch(`${this.baseUrl}/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(portfolio),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create portfolio');
    }
    
    return response.json();
  }

  async getTransactions(): Promise<Transaction[]> {
    const response = await fetch(`${this.baseUrl}/transactions`);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...transaction,
        date: transaction.date.toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add transaction');
    }
    
    const result = await response.json();
    return {
      ...result,
      date: new Date(result.date),
    };
  }

  async getCashPositions(): Promise<Record<string, number>> {
    const response = await fetch(`${this.baseUrl}/cash-position`);
    if (!response.ok) {
      throw new Error('Failed to fetch cash positions');
    }
    return response.json();
  }

  async updateCashPosition(portfolioId: string, amount: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cash-position`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ portfolioId, amount }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update cash position');
    }
  }

  async getUserActions(): Promise<UserAction[]> {
    const response = await fetch(`${this.baseUrl}/user-actions`);
    if (!response.ok) {
      throw new Error('Failed to fetch user actions');
    }
    return response.json();
  }
}

export const apiStorageService = new ApiStorageService();
