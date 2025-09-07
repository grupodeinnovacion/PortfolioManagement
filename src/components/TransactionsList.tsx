'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/types/portfolio';
import { formatCurrency } from '@/lib/utils';

interface TransactionsListProps {
  portfolioId: string;
  currency?: string;
  onTransactionUpdate?: () => void;
}

export default function TransactionsList({ portfolioId, currency = 'USD', onTransactionUpdate }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof Transaction>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterAction, setFilterAction] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  useEffect(() => {
    fetchTransactions();
  }, [portfolioId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transactions`);
      if (response.ok) {
        const allTransactions = await response.json();
        const portfolioTransactions = allTransactions
          .filter((t: Transaction) => t.portfolioId === portfolioId)
          .map((t: Transaction) => ({
            ...t,
            date: new Date(t.date)
          }));
        setTransactions(portfolioTransactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add a function to refresh transactions and notify parent
  const refreshTransactions = async () => {
    await fetchTransactions();
    if (onTransactionUpdate) {
      onTransactionUpdate();
    }
  };

  // Listen for page visibility changes to refresh data when returning from other pages
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshTransactions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [portfolioId, onTransactionUpdate]);

  const handleSort = (column: keyof Transaction) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue: string | number | Date = a[sortBy] || '';
    let bValue: string | number | Date = b[sortBy] || '';
    
    if (sortBy === 'date') {
      aValue = new Date(aValue as Date).getTime();
      bValue = new Date(bValue as Date).getTime();
    }
    
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
    if (bValue == null) return sortOrder === 'asc' ? 1 : -1;
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredTransactions = sortedTransactions.filter(transaction => {
    if (filterAction === 'ALL') return true;
    return transaction.action === filterAction;
  });

  const totalBuys = transactions
    .filter(t => t.action === 'BUY')
    .reduce((sum, t) => sum + (t.quantity * t.tradePrice + t.fees), 0);

  const totalSells = transactions
    .filter(t => t.action === 'SELL')
    .reduce((sum, t) => sum + (t.quantity * t.tradePrice - t.fees), 0);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>No transactions found for this portfolio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h3>
          <div className="flex items-center space-x-4">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as 'ALL' | 'BUY' | 'SELL')}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="ALL">All Transactions</option>
              <option value="BUY">Buy Orders</option>
              <option value="SELL">Sell Orders</option>
            </select>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
            <p className="text-sm text-green-600 dark:text-green-400">Total Purchases</p>
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">
              {formatCurrency(totalBuys, currency)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">Total Sales</p>
            <p className="text-lg font-semibold text-red-700 dark:text-red-300">
              {formatCurrency(totalSells, currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('date')}
              >
                Date
                {sortBy === 'date' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('action')}
              >
                Action
                {sortBy === 'action' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('ticker')}
              >
                Ticker
                {sortBy === 'ticker' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('quantity')}
              >
                Quantity
                {sortBy === 'quantity' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('tradePrice')}
              >
                Price
                {sortBy === 'tradePrice' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Total
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('fees')}
              >
                Fees
                {sortBy === 'fees' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTransactions.map((transaction) => {
              const total = transaction.quantity * transaction.tradePrice;
              const totalWithFees = transaction.action === 'BUY' ? total + transaction.fees : total - transaction.fees;
              
              return (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.action === 'BUY'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {transaction.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.ticker}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {transaction.exchange}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.quantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(transaction.tradePrice, transaction.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.action === 'BUY' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                      {formatCurrency(totalWithFees, transaction.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(transaction.fees, transaction.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
