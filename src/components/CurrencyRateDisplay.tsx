import React, { useState, useEffect } from 'react';
import { realTimeCurrencyService } from '@/services/realTimeCurrencyService';

interface CurrencyRateDisplayProps {
  fromCurrency: string;
  toCurrency: string;
  className?: string;
  showLabel?: boolean;
  inline?: boolean;
}

interface CurrencyRateInfo {
  rate: number;
  isRealTime: boolean;
  lastUpdated: Date;
  source: 'realtime' | 'fallback' | 'cache';
}

export function CurrencyRateDisplay({ 
  fromCurrency, 
  toCurrency, 
  className = '', 
  showLabel = true,
  inline = false 
}: CurrencyRateDisplayProps) {
  const [rateInfo, setRateInfo] = useState<CurrencyRateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fromCurrency === toCurrency) {
      setRateInfo({
        rate: 1,
        isRealTime: true,
        lastUpdated: new Date(),
        source: 'realtime'
      });
      setLoading(false);
      return;
    }

    const fetchRate = async () => {
      try {
        setLoading(true);
        setError(null);

        const rate = await realTimeCurrencyService.getExchangeRate(fromCurrency, toCurrency);
        
        // Get cache status to determine if this is real-time or cached
        const cacheStatus = realTimeCurrencyService.getCacheStatus();
        const cacheEntry = cacheStatus.find(entry => entry.currency === fromCurrency);
        
        const now = new Date();
        const isCache = cacheEntry && now.getTime() < cacheEntry.expiresAt;
        
        setRateInfo({
          rate,
          isRealTime: !isCache,
          lastUpdated: cacheEntry ? new Date(cacheEntry.timestamp) : now,
          source: isCache ? 'cache' : 'realtime'
        });
      } catch (err) {
        console.error('Failed to fetch exchange rate:', err);
        setError('Failed to load rate');
        
        // Try to get fallback rate
        try {
          const fallbackRate = await realTimeCurrencyService.getExchangeRate(fromCurrency, toCurrency);
          setRateInfo({
            rate: fallbackRate,
            isRealTime: false,
            lastUpdated: new Date(),
            source: 'fallback'
          });
        } catch (fallbackErr) {
          console.error('Fallback rate also failed:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [fromCurrency, toCurrency]);

  if (loading) {
    return (
      <div className={`${className} ${inline ? 'inline-flex' : 'flex'} items-center gap-1`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (error && !rateInfo) {
    return (
      <div className={`${className} ${inline ? 'inline-flex' : 'flex'} items-center gap-1 text-red-500`}>
        <span className="text-sm">Rate unavailable</span>
      </div>
    );
  }

  if (!rateInfo) return null;

  const getSourceIcon = () => {
    switch (rateInfo.source) {
      case 'realtime':
        return '🟢'; // Real-time
      case 'cache':
        return '🟡'; // Cached
      case 'fallback':
        return '🟠'; // Fallback
      default:
        return '⚪';
    }
  };

  const getSourceText = () => {
    switch (rateInfo.source) {
      case 'realtime':
        return 'Live rate';
      case 'cache':
        return 'Cached rate';
      case 'fallback':
        return 'Fallback rate';
      default:
        return 'Rate';
    }
  };

  const formatRate = (rate: number) => {
    if (rate >= 1) {
      return rate.toFixed(4);
    } else {
      return rate.toFixed(6);
    }
  };

  if (inline) {
    return (
      <span className={`${className} inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400`}>
        <span className="text-xs" title={getSourceText()}>{getSourceIcon()}</span>
        <span className="font-mono">
          1 {fromCurrency} = {formatRate(rateInfo.rate)} {toCurrency}
        </span>
      </span>
    );
  }

  return (
    <div className={`${className} bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs" title={getSourceText()}>{getSourceIcon()}</span>
          {showLabel && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Exchange Rate
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
            1 {fromCurrency} = {formatRate(rateInfo.rate)} {toCurrency}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {getSourceText()} • {rateInfo.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {rateInfo.source === 'fallback' && (
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <span>⚠️</span>
          <span>Using fallback rates - real-time data unavailable</span>
        </div>
      )}
    </div>
  );
}

// Compact version for small spaces
export function CompactCurrencyRate({ fromCurrency, toCurrency, className = '' }: Omit<CurrencyRateDisplayProps, 'showLabel' | 'inline'>) {
  return (
    <CurrencyRateDisplay 
      fromCurrency={fromCurrency} 
      toCurrency={toCurrency} 
      className={className}
      showLabel={false}
      inline={true}
    />
  );
}

// Multi-currency rate display for dashboard
export function MultiCurrencyRateDisplay({ baseCurrency, targetCurrencies, className = '' }: {
  baseCurrency: string;
  targetCurrencies: string[];
  className?: string;
}) {
  return (
    <div className={`${className} space-y-2`}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Current Exchange Rates ({baseCurrency} base)
      </h4>
      {targetCurrencies
        .filter(currency => currency !== baseCurrency)
        .map(currency => (
          <CurrencyRateDisplay
            key={currency}
            fromCurrency={baseCurrency}
            toCurrency={currency}
            showLabel={false}
            className="mb-2"
          />
        ))}
    </div>
  );
}
