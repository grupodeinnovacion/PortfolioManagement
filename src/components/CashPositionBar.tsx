'use client';

import { formatCurrency, calculatePercentage } from '@/lib/utils';

interface CashPositionBarProps {
  cashPosition: number;
  investedAmount: number;
  currency: string;
}

export default function CashPositionBar({ 
  cashPosition, 
  investedAmount, 
  currency 
}: CashPositionBarProps) {
  const totalValue = cashPosition + investedAmount;
  const cashPercentage = calculatePercentage(cashPosition, totalValue);
  const investedPercentage = calculatePercentage(investedAmount, totalValue);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Cash vs Investment Position
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {formatCurrency(totalValue, currency)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="flex h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          {/* Cash Position */}
          <div 
            className="bg-blue-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${cashPercentage}%` }}
          >
            {cashPercentage > 15 && (
              <span>Cash: {cashPercentage.toFixed(1)}%</span>
            )}
          </div>
          
          {/* Invested Amount */}
          <div 
            className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${investedPercentage}%` }}
          >
            {investedPercentage > 15 && (
              <span>Invested: {investedPercentage.toFixed(1)}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Cash Position: {formatCurrency(cashPosition, currency)}
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Invested: {formatCurrency(investedAmount, currency)}
            </span>
          </div>
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">
          Allocation: {cashPercentage.toFixed(1)}% / {investedPercentage.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
