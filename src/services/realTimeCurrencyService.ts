interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
}

interface CacheEntry {
  rates: Record<string, number>;
  timestamp: number;
  expiresAt: number;
}

export class RealTimeCurrencyService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly API_ENDPOINTS = [
    'https://api.exchangerate-api.com/v4/latest/',
    'https://open.er-api.com/v6/latest/',
    'https://api.fxratesapi.com/latest'
  ];

  /**
   * Get real-time exchange rates for a base currency
   */
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    const cacheKey = baseCurrency.toUpperCase();
    const cachedEntry = this.cache.get(cacheKey);
    
    // Check if cache is valid
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      console.log(`Using cached exchange rates for ${baseCurrency}`);
      return cachedEntry.rates;
    }

    try {
      console.log(`Fetching real-time exchange rates for ${baseCurrency}...`);
      const rates = await this.fetchFromAPIs(baseCurrency);
      
      // Cache the results
      this.cache.set(cacheKey, {
        rates,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION
      });
      
      return rates;
    } catch (error) {
      console.error('Failed to fetch real-time rates, using fallback:', error);
      
      // If we have expired cache, use it as fallback
      if (cachedEntry) {
        console.log(`Using expired cache for ${baseCurrency} as fallback`);
        return cachedEntry.rates;
      }
      
      // Last resort: return hardcoded rates
      return this.getFallbackRates(baseCurrency);
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;
    
    try {
      const rates = await this.getExchangeRates(fromCurrency);
      const rate = rates[toCurrency.toUpperCase()];
      
      if (!rate) {
        throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
      }
      
      return rate;
    } catch (error) {
      console.error(`Error getting exchange rate ${fromCurrency} to ${toCurrency}:`, error);
      // Fallback to hardcoded rates
      return this.getFallbackExchangeRate(fromCurrency, toCurrency);
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Fetch rates from multiple API endpoints with fallback
   */
  private async fetchFromAPIs(baseCurrency: string): Promise<Record<string, number>> {
    const errors: Error[] = [];
    
    for (const endpoint of this.API_ENDPOINTS) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${endpoint}${baseCurrency}`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data: ExchangeRateResponse = await response.json();
        
        if (data.result === 'success' || data.conversion_rates) {
          const rates = data.conversion_rates || (data as { rates?: Record<string, number> }).rates;
          console.log(`Successfully fetched rates from ${endpoint}`);
          return rates || {};
        }
        
        throw new Error('Invalid response format');
      } catch (error) {
        console.warn(`Failed to fetch from ${endpoint}:`, error);
        errors.push(error as Error);
        continue;
      }
    }
    
    throw new Error(`All API endpoints failed: ${errors.map(e => e.message).join(', ')}`);
  }

  /**
   * Fallback hardcoded exchange rates (updated September 2025)
   */
  private getFallbackRates(baseCurrency: string): Record<string, number> {
    const fallbackRates: Record<string, Record<string, number>> = {
      USD: {
        USD: 1,
        INR: 88.23, // Updated to current rate
        EUR: 0.90,
        GBP: 0.76,
        JPY: 148.50,
        CAD: 1.35,
        AUD: 1.48,
        CHF: 0.86,
        CNY: 7.25
      },
      INR: {
        USD: 0.01134, // 1/88.23
        INR: 1,
        EUR: 0.0102,
        GBP: 0.0086,
        JPY: 1.683,
        CAD: 0.0153,
        AUD: 0.0168,
        CHF: 0.0098,
        CNY: 0.0822
      },
      EUR: {
        USD: 1.18,
        INR: 98.35,
        EUR: 1,
        GBP: 0.86,
        JPY: 175.50,
        CAD: 1.60,
        AUD: 1.79,
        CHF: 1.02,
        CNY: 8.58
      },
      GBP: {
        USD: 1.37,
        INR: 113.89,
        EUR: 1.16,
        GBP: 1,
        JPY: 204.15,
        CAD: 1.86,
        AUD: 2.08,
        CHF: 1.19,
        CNY: 9.98
      }
    };
    
    return fallbackRates[baseCurrency] || fallbackRates.USD;
  }

  /**
   * Fallback exchange rate calculation
   */
  private getFallbackExchangeRate(fromCurrency: string, toCurrency: string): number {
    const rates = this.getFallbackRates(fromCurrency);
    return rates[toCurrency] || 1;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Exchange rate cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { currency: string; timestamp: number; expiresAt: number }[] {
    const status: { currency: string; timestamp: number; expiresAt: number }[] = [];
    
    this.cache.forEach((entry, currency) => {
      status.push({
        currency,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt
      });
    });
    
    return status;
  }

  /**
   * Force refresh rates for a currency
   */
  async refreshRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    this.cache.delete(baseCurrency.toUpperCase());
    return this.getExchangeRates(baseCurrency);
  }
}

// Singleton instance
export const realTimeCurrencyService = new RealTimeCurrencyService();
