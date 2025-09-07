'use client';

import { useState } from 'react';
import { Edit, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import { Portfolio } from '@/types/portfolio';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface PortfolioHeaderProps {
  portfolio: Portfolio;
  onCashPositionUpdate: (amount: number) => void;
}

export default function PortfolioHeader({ portfolio, onCashPositionUpdate }: PortfolioHeaderProps) {
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashAmount, setCashAmount] = useState(portfolio.cashPosition.toString());

  const handleCashUpdate = () => {
    const amount = parseFloat(cashAmount);
    if (!isNaN(amount) && amount >= 0) {
      onCashPositionUpdate(amount);
      setIsEditingCash(false);
    }
  };

  const handleCancelEdit = () => {
    setCashAmount(portfolio.cashPosition.toString());
    setIsEditingCash(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4">
        {/* Navigation */}
        <div className="flex items-center mb-4">
          <Link 
            href="/"
            className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        {/* Portfolio Info */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {portfolio.name}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                (portfolio.totalReturnPercent || 0) >= 0 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                {(portfolio.totalReturnPercent || 0) >= 0 ? '+' : ''}{(portfolio.totalReturnPercent || 0).toFixed(2)}%
              </span>
            </div>
            {portfolio.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {portfolio.description}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Last updated: {formatDateTime(portfolio.updatedAt || new Date())}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Cash Position Edit */}
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Cash Position</div>
              {isEditingCash ? (
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="0.00"
                  />
                  <button
                    onClick={handleCashUpdate}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(portfolio.cashPosition, portfolio.currency)}
                  </span>
                  <button
                    onClick={() => setIsEditingCash(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <Link
              href={`/portfolio/${portfolio.id}/settings`}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Portfolio Stats Bar */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Invested</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(portfolio.totalInvested || 0, portfolio.currency)}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Current Value</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(portfolio.currentValue || 0, portfolio.currency)}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total P&L</div>
            <div className={`text-lg font-semibold ${
              (portfolio.totalReturn || 0) >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(portfolio.totalReturn || 0, portfolio.currency)}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">XIRR</div>
            <div className={`text-lg font-semibold ${
              (portfolio.xirr || 0) >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {(portfolio.xirr || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
