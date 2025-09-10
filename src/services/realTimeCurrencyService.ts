// Real-time Currency Service - Client-side version without caching
// Caching is handled at the API level

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
}

export class RealTimeCurrencyService {
  private readonly API_ENDPOINTS = [
    'https://api.exchangerate-api.com/v4/latest/',
    'https://open.er-api.com/v6/latest/',
    'https://api.fxratesapi.com/latest'
  ];

  /**
   * Get real-time exchange rates for a base currency (no caching in client service)
   */
  async getExchangeRates(baseCurrency: string = 'USD', forceRefresh = false): Promise<Record<string, number>> {
    try {
      // Fetch from API with multiple endpoint fallbacks
      const rates = await this.fetchRatesWithFallback(baseCurrency);
      return rates;
    } catch (error) {
      console.error(`Failed to fetch exchange rates for ${baseCurrency}:`, error);
      throw error;
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
      // Return 1 as fallback rate
      return 1;
    }
  }

  /**
   * Convert an amount from one currency to another
   */
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Fetch rates with fallback to multiple endpoints
   */
  private async fetchRatesWithFallback(baseCurrency: string): Promise<Record<string, number>> {
    const errors: Error[] = [];
    
    for (const endpoint of this.API_ENDPOINTS) {
      try {
        const rates = await this.fetchFromAPI(endpoint, baseCurrency);
        if (rates && Object.keys(rates).length > 0) {
          return rates;
        }
      } catch (error) {
        errors.push(error as Error);
        console.warn(`Failed to fetch from ${endpoint}:`, error);
      }
    }
    
    throw new Error(`All exchange rate APIs failed. Errors: ${errors.map(e => e.message).join(', ')}`);
  }

  /**
   * Fetch from a single API endpoint
   */
  private async fetchFromAPI(endpoint: string, baseCurrency: string): Promise<Record<string, number>> {
    const response = await fetch(`${endpoint}${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: ExchangeRateResponse = await response.json();
    
    if (!data.conversion_rates && !(data as any).rates) {
      throw new Error('Invalid response format - no rates found');
    }
    
    return data.conversion_rates || (data as any).rates || {};
  }

  /**
   * Clear cache (no-op in client version - caching handled by API)
   */
  clearCache(): void {
    console.log('Cache clearing is handled at the API level');
  }

  /**
   * Get cache status (no-op in client version - caching handled by API)
   */
  getCacheStatus(): { currency: string; age: number | null; cacheKey: string }[] {
    console.log('Cache status is handled at the API level');
    return [];
  }

  /**
   * Test connection to all currency APIs
   */
  async testConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const endpoint of this.API_ENDPOINTS) {
      try {
        await this.fetchFromAPI(endpoint, 'USD');
        results[endpoint] = true;
      } catch (error) {
        results[endpoint] = false;
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const realTimeCurrencyService = new RealTimeCurrencyService();
