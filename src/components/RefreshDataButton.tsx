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
    
    setIsRefreshing(true);
    
    try {
      console.log('Refreshing market data...');
      
      const url = portfolioId 
        ? `/api/market-data?portfolioId=${portfolioId}`
        : '/api/market-data';
      
      const response = await fetch(url, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Market data refreshed:', result);
      
      setLastRefresh(new Date());
      
      // Call parent refresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
      
      // Show success message
      if (result.updatedCount > 0) {
        alert(`✅ Market data updated for ${result.updatedCount} holdings`);
      } else {
        alert('✅ Market data refreshed successfully');
      }
      
    } catch (error) {
      console.error('Error refreshing market data:', error);
      alert('❌ Failed to refresh market data. Please try again.');
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
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${isRefreshing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }
        `}
        title={portfolioId ? `Refresh data for ${portfolioId}` : 'Refresh all market data'}
      >
        <RefreshCw 
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
        />
        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
      </button>
      
      {lastRefresh && (
        <span className="text-sm text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
