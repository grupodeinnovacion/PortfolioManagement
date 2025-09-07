'use client';

import { useState } from 'react';
import { Plus, Download, Calendar } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Transaction {
  id: string;
  date: Date;
  action: 'BUY' | 'SELL';
  ticker: string;
  name: string;
  quantity: number;
  price: number;
  fees: number;
  total: number;
  notes?: string;
}

interface TransactionsListProps {
  portfolioId: string;
}

// Mock transaction data
const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2024-09-05'),
    action: 'SELL',
    ticker: 'SOXX',
    name: 'iShares Semiconductor ETF',
    quantity: 151.32,
    price: 247.77,
    fees: 5.00,
    total: 37497.45,
    notes: 'Profit taking'
  },
  {
    id: '2',
    date: new Date('2024-09-04'),
    action: 'BUY',
    ticker: 'RKLB',
    name: 'Rocket Lab Corp',
    quantity: 125,
    price: 43.00,
    fees: 5.00,
    total: 5380.00
  },
  {
    id: '3',
    date: new Date('2024-09-04'),
    action: 'BUY',
    ticker: 'EVVTY',
    name: 'Evolution ADR',
    quantity: 60.5,
    price: 82.84,
    fees: 7.50,
    total: 5019.32
  },
  {
    id: '4',
    date: new Date('2024-08-15'),
    action: 'BUY',
    ticker: 'NVDA',
    name: 'NVIDIA Corp',
    quantity: 50,
    price: 125.50,
    fees: 5.00,
    total: 6280.00
  },
  {
    id: '5',
    date: new Date('2024-08-10'),
    action: 'BUY',
    ticker: 'MSFT',
    name: 'Microsoft Corp',
    quantity: 25,
    price: 415.75,
    fees: 5.00,
    total: 10398.75
  }
];

export default function TransactionsList({ portfolioId }: TransactionsListProps) {
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterAction, setFilterAction] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const handleSort = (field: keyof Transaction) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedTransactions = transactions
    .filter(transaction => filterAction === 'ALL' || transaction.action === filterAction)
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

  const totalBought = transactions
    .filter(t => t.action === 'BUY')
    .reduce((sum, t) => sum + t.total, 0);

  const totalSold = transactions
    .filter(t => t.action === 'SELL')
    .reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transaction History
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {transactions.length} transactions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filter */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value as 'ALL' | 'BUY' | 'SELL')}
              className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="ALL">All Transactions</option>
              <option value="BUY">Buy Orders</option>
              <option value="SELL">Sell Orders</option>
            </select>

            {/* Export Button */}
            <button
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>

            {/* Add Transaction Button */}
            <Link
              href={`/transaction/new?portfolio=${portfolioId}`}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg">
            <div className="text-sm text-green-600 dark:text-green-400">Total Purchases</div>
            <div className="text-lg font-semibold text-green-900 dark:text-green-100">
              {formatCurrency(totalBought, 'USD')}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900 p-3 rounded-lg">
            <div className="text-sm text-red-600 dark:text-red-400">Total Sales</div>
            <div className="text-lg font-semibold text-red-900 dark:text-red-100">
              {formatCurrency(totalSold, 'USD')}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
            <div className="text-sm text-blue-600 dark:text-blue-400">Net Investment</div>
            <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {formatCurrency(totalBought - totalSold, 'USD')}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('date')}
              >
                Date
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('action')}
              >
                Action
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('ticker')}
              >
                Security
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('quantity')}
              >
                Quantity
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('price')}
              >
                Price
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('fees')}
              >
                Fees
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('total')}
              >
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatDate(transaction.date)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.action === 'BUY'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {transaction.action}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.ticker}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {transaction.name}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {transaction.quantity.toFixed(2)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {formatCurrency(transaction.price, 'USD')}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {formatCurrency(transaction.fees, 'USD')}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(transaction.total, 'USD')}
                </td>
                
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {transaction.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedTransactions.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No transactions</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first transaction.
            </p>
            <div className="mt-6">
              <Link
                href={`/transaction/new?portfolio=${portfolioId}`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
