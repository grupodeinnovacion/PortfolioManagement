'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshDataButtonProps {
  portfolioId?: string;
  onRefresh?: () => void;
  className?: string;
}

export default function RefreshDataButton({ 
  portfolioId, 
  onRefresh,
  className = '' 
}: RefreshDataButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    // Prevent rapid successive refreshes - minimum 5 seconds between refreshes
    if (lastRefresh && (Date.now() - lastRefresh.getTime()) < 5000) {
      console.log('Refresh attempted too soon, ignoring...');
      return;
    }
    
    setIsRefreshing(true);
    
    try {
      console.log('Starting comprehensive data refresh...');
      
      // Use the new comprehensive refresh API that updates both stocks and currency rates
      const response = await fetch('/api/refresh', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Comprehensive refresh completed:', result);
      
      // Show success summary
      if (result.success && result.results) {
        const { stocksUpdated, currencyRatesUpdated, portfoliosRefreshed } = result.results;
        console.log(`Updated: ${stocksUpdated} stocks, ${currencyRatesUpdated} currency rates, ${portfoliosRefreshed} portfolios`);
        
        // Show brief success notification
        const message = `Refreshed ${stocksUpdated} stocks & ${currencyRatesUpdated} rates in ${result.results.summary.duration}`;
        console.log(message);
      }
      
      setLastRefresh(new Date());
      
      // Call parent refresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
      // Show brief success notification instead of alert
      console.log('✅ All data refreshed successfully');
      
    } catch (error) {
      console.error('Error during comprehensive refresh:', error);
      // Keep alert for errors since user needs to know
      alert('❌ Failed to refresh data. Please try again.');
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
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
          ${isRefreshing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }
        `}
        title="Refresh all data (stocks, currency rates, and portfolio calculations)"
      >
        <RefreshCw 
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
        />
        {isRefreshing ? 'Refreshing...' : 'Refresh All Data'}
      </button>
      
      {lastRefresh && (
        <span className="text-sm text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
