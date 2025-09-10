import React from 'react';
import { realTimeCurrencyService } from '@/services/realTimeCurrencyService';
import { RefreshCw } from 'lucide-react';

interface CurrencyRefreshButtonProps {
  baseCurrency?: string;
  onRefresh?: () => void;
  className?: string;
}

export function CurrencyRefreshButton({ 
  baseCurrency = 'USD', 
  onRefresh,
  className = '' 
}: CurrencyRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<Date | null>(null);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      
      // Clear cache and fetch fresh rates
      realTimeCurrencyService.clearCache();
      await realTimeCurrencyService.getExchangeRates(baseCurrency, true); // Force refresh
      
      setLastRefresh(new Date());
      
      // Notify parent component
      if (onRefresh) {
        onRefresh();
      }
      
      console.log('Currency rates refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh currency rates:', error);
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
          inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors
          ${isRefreshing 
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
          }
        `}
        title="Refresh exchange rates"
      >
        <RefreshCw 
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
        />
        {isRefreshing ? 'Refreshing...' : 'Refresh Rates'}
      </button>
      
      {lastRefresh && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
