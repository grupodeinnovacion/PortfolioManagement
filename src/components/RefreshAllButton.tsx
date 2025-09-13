'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshAllButtonProps {
  onRefresh?: () => void;
  className?: string;
}

export function RefreshAllButton({
  onRefresh,
  className = ''
}: RefreshAllButtonProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log('🔄 Starting manual refresh of all data...');

      // Trigger the automatic refresh mechanism
      window.dispatchEvent(new CustomEvent('portfolioDataRefresh'));

      // Small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 1000));

      setLastRefresh(new Date());

      // Notify parent component
      if (onRefresh) {
        onRefresh();
      }

      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Failed to refresh all data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`
          inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200
          ${isRefreshing
            ? 'bg-blue-50 text-blue-400 border-blue-200 cursor-not-allowed'
            : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm hover:shadow-md'
          }
        `}
        title="Refresh all portfolio data including stock prices and calculations"
      >
        <RefreshCw
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
        />
        {isRefreshing ? 'Refreshing All Data...' : 'Refresh All Data'}
      </button>

      {lastRefresh && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}