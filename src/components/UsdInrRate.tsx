import React, { useState, useEffect } from 'react';
import { realTimeCurrencyService } from '@/services/realTimeCurrencyService';
import { RefreshCw } from 'lucide-react';

interface UsdInrRateProps {
  className?: string;
  showRefresh?: boolean;
}

export function UsdInrRate({ className = '', showRefresh = true }: UsdInrRateProps) {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [source, setSource] = useState<'realtime' | 'cache' | 'fallback'>('realtime');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchRate = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
        realTimeCurrencyService.clearCache();
      } else {
        setLoading(true);
      }

      const exchangeRate = await realTimeCurrencyService.getExchangeRate('USD', 'INR');
      
      // Check if this is from cache or real-time
      const cacheStatus = realTimeCurrencyService.getCacheStatus();
      const usdCache = cacheStatus.find(entry => entry.currency === 'USD');
      const now = new Date();
      const isFromCache = usdCache && now.getTime() < usdCache.expiresAt;
      
      setRate(exchangeRate);
      setSource(isFromCache ? 'cache' : 'realtime');
      setLastUpdated(now);
    } catch (error) {
      console.error('Failed to fetch USD to INR rate:', error);
      // Try to get fallback rate
      try {
        const fallbackRate = 88.23; // Current fallback rate (Sept 2025)
        setRate(fallbackRate);
        setSource('fallback');
        setLastUpdated(new Date());
      } catch (fallbackError) {
        console.error('Fallback rate also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRate();
  }, []);

  const getStatusIcon = () => {
    switch (source) {
      case 'realtime':
        return '🟢';
      case 'cache':
        return '🟡';
      case 'fallback':
        return '🟠';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    switch (source) {
      case 'realtime':
        return 'Live rate';
      case 'cache':
        return 'Cached';
      case 'fallback':
        return 'Fallback';
      default:
        return 'Rate';
    }
  };

  if (loading && !rate) {
    return (
      <div className={`${className} flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (!rate) {
    return (
      <div className={`${className} flex items-center gap-2 text-sm text-red-500`}>
        <span>Rate unavailable</span>
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300`}>
      <div className="flex items-center gap-1">
        <span className="font-mono font-semibold">
          $1 = ₹{rate.toFixed(2)}
        </span>
        <span className="text-xs" title={getStatusText()}>
          {getStatusIcon()}
        </span>
      </div>
      
      {showRefresh && (
        <button
          onClick={() => fetchRate(true)}
          disabled={isRefreshing}
          className={`
            p-1 rounded transition-colors
            ${isRefreshing 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }
          `}
          title="Refresh USD to INR rate"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}

// Compact version for tight spaces
export function CompactUsdInrRate({ className = '' }: { className?: string }) {
  return <UsdInrRate className={className} showRefresh={false} />;
}
