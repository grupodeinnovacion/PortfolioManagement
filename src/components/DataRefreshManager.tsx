'use client';

import { useEffect, useRef } from 'react';

interface DataRefreshManagerProps {
  onRefresh?: () => void;
  interval?: number; // milliseconds
  enabled?: boolean;
}

export default function DataRefreshManager({
  onRefresh,
  interval = 30 * 60 * 1000, // 30 minutes default
  enabled = true
}: DataRefreshManagerProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());

  const refreshData = async () => {
    try {
      console.log('🔄 Performing scheduled data refresh...');

      // Refresh market data for all stocks
      const refreshResponse = await fetch('/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.ok) {
        console.log('✅ Market data refreshed successfully');

        // Refresh dashboard cache for common currencies
        const currencies = ['USD', 'EUR', 'GBP', 'INR'];
        const dashboardRefreshPromises = currencies.map(currency =>
          fetch('/api/dashboard', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ currency }),
          })
        );

        await Promise.allSettled(dashboardRefreshPromises);
        console.log('✅ Dashboard caches refreshed');

        lastRefreshRef.current = Date.now();

        // Call the optional refresh callback
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('❌ Failed to refresh market data');
      }
    } catch (error) {
      console.error('❌ Error during scheduled data refresh:', error);
    }
  };

  const setupInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (enabled) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshRef.current;

        // Only refresh if it's been at least the interval time since last refresh
        if (timeSinceLastRefresh >= interval) {
          refreshData();
        }
      }, interval);

      console.log(`📅 Data refresh scheduled every ${interval / 60000} minutes`);
    }
  };

  useEffect(() => {
    if (enabled) {
      setupInterval();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval]);

  // Handle manual refresh on user action (like clicking "Refresh All Data" button)
  const handleManualRefresh = () => {
    refreshData();
  };

  // Add event listener for manual refresh trigger
  useEffect(() => {
    const handleRefreshEvent = () => {
      handleManualRefresh();
    };

    window.addEventListener('portfolioDataRefresh', handleRefreshEvent);
    return () => {
      window.removeEventListener('portfolioDataRefresh', handleRefreshEvent);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}