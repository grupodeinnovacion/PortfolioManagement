// Market hours utility for smart refresh intervals
export interface MarketHours {
  open: number; // Hour in 24h format (e.g., 9.5 = 9:30 AM)
  close: number; // Hour in 24h format (e.g., 16 = 4:00 PM)
  timezone: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
}

const MARKET_SCHEDULES: Record<string, MarketHours> = {
  'NYSE': {
    open: 9.5, // 9:30 AM
    close: 16, // 4:00 PM
    timezone: 'America/New_York',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  },
  'NASDAQ': {
    open: 9.5, // 9:30 AM
    close: 16, // 4:00 PM
    timezone: 'America/New_York',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  },
  'NSE': {
    open: 9.25, // 9:15 AM
    close: 15.5, // 3:30 PM
    timezone: 'Asia/Kolkata',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  },
  'BSE': {
    open: 9.25, // 9:15 AM
    close: 15.5, // 3:30 PM
    timezone: 'Asia/Kolkata',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  }
};

/**
 * Check if any major market is currently open
 * Returns true if any of the major markets (NYSE, NASDAQ, NSE, BSE) are open
 */
export function isAnyMarketOpen(): boolean {
  const exchanges = ['NYSE', 'NASDAQ', 'NSE', 'BSE'];
  return exchanges.some(exchange => isMarketOpen(exchange));
}

/**
 * Check if a specific market is currently open
 */
export function isMarketOpen(exchange: string): boolean {
  const market = MARKET_SCHEDULES[exchange.toUpperCase()];
  if (!market) {
    console.warn(`Unknown exchange: ${exchange}`);
    return false; // Conservative approach - assume closed if unknown
  }

  try {
    const now = new Date();

    // Get current time in market timezone
    const marketTime = new Date(now.toLocaleString("en-US", { timeZone: market.timezone }));

    // Check if it's a trading day
    const dayOfWeek = marketTime.getDay();
    if (!market.days.includes(dayOfWeek)) {
      return false;
    }

    // Convert current time to decimal hours (e.g., 9:30 = 9.5)
    const currentHour = marketTime.getHours() + marketTime.getMinutes() / 60;

    // Check if within trading hours
    return currentHour >= market.open && currentHour <= market.close;
  } catch (error) {
    console.error(`Error checking market hours for ${exchange}:`, error);
    return false; // Conservative approach
  }
}

/**
 * Get appropriate cache/stale time based on market status
 * Returns shorter intervals when markets are open, longer when closed
 */
export function getMarketAwareStaleTime(): number {
  const isOpen = isAnyMarketOpen();

  if (isOpen) {
    // Markets open: more frequent updates (2 minutes)
    return 2 * 60 * 1000;
  } else {
    // Markets closed: less frequent updates (10 minutes)
    return 10 * 60 * 1000;
  }
}

/**
 * Get appropriate refetch interval based on market status
 * Returns null (no auto-refetch) when markets are closed
 */
export function getMarketAwareRefetchInterval(): number | false {
  const isOpen = isAnyMarketOpen();

  if (isOpen) {
    // Markets open: refetch every 5 minutes
    return 5 * 60 * 1000;
  } else {
    // Markets closed: no automatic refetching
    return false;
  }
}

/**
 * Get cache time based on data type and market status
 */
export function getMarketAwareCacheTime(dataType: 'dashboard' | 'portfolios' | 'transactions' | 'settings'): number {
  const isOpen = isAnyMarketOpen();

  const cacheTimes = {
    dashboard: isOpen ? 5 * 60 * 1000 : 30 * 60 * 1000, // 5min vs 30min
    portfolios: isOpen ? 10 * 60 * 1000 : 60 * 60 * 1000, // 10min vs 1hour
    transactions: 10 * 60 * 1000, // Always 10 minutes
    settings: 60 * 60 * 1000 // Always 1 hour
  };

  return cacheTimes[dataType];
}