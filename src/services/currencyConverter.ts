interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyConversionResponse {
  base: string;
  rates: ExchangeRates;
}

class CurrencyConverter {
  private static instance: CurrencyConverter;
  private exchangeRates: ExchangeRates = {};
  private lastUpdated: Date | null = null;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  private constructor() {}

  static getInstance(): CurrencyConverter {
    if (!CurrencyConverter.instance) {
      CurrencyConverter.instance = new CurrencyConverter();
    }
    return CurrencyConverter.instance;
  }

  // Mock exchange rates for development (in production, you'd use a real API)
  private getMockExchangeRates(): ExchangeRates {
    return {
      'USD': 1.0,      // Base currency
      'INR': 83.25,    // 1 USD = 83.25 INR
      'EUR': 0.85,     // 1 USD = 0.85 EUR
      'GBP': 0.73,     // 1 USD = 0.73 GBP
      'JPY': 110.0,    // 1 USD = 110 JPY
      'CAD': 1.25,     // 1 USD = 1.25 CAD
      'AUD': 1.35,     // 1 USD = 1.35 AUD
      'CHF': 0.92,     // 1 USD = 0.92 CHF
    };
  }

  private async fetchExchangeRates(): Promise<void> {
    try {
      // In development, use mock rates
      // In production, you could use a service like:
      // - https://api.exchangerate-api.com/
      // - https://fixer.io/
      // - https://openexchangerates.org/
      
      if (process.env.NODE_ENV === 'development') {
        this.exchangeRates = this.getMockExchangeRates();
        this.lastUpdated = new Date();
        return;
      }

      // For production, uncomment and configure with your preferred API:
      /*
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data: CurrencyConversionResponse = await response.json();
      this.exchangeRates = { USD: 1, ...data.rates };
      this.lastUpdated = new Date();
      */
      
      // Fallback to mock rates if API fails
      this.exchangeRates = this.getMockExchangeRates();
      this.lastUpdated = new Date();
    } catch (error) {
      console.error('Failed to fetch exchange rates, using mock data:', error);
      this.exchangeRates = this.getMockExchangeRates();
      this.lastUpdated = new Date();
    }
  }

  private async ensureRatesUpdated(): Promise<void> {
    const now = new Date();
    const needsUpdate = !this.lastUpdated || 
      (now.getTime() - this.lastUpdated.getTime()) > this.CACHE_DURATION;

    if (needsUpdate || Object.keys(this.exchangeRates).length === 0) {
      await this.fetchExchangeRates();
    }
  }

  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    await this.ensureRatesUpdated();

    const fromRate = this.exchangeRates[fromCurrency];
    const toRate = this.exchangeRates[toCurrency];

    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} or ${toCurrency}`);
    }

    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;

    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  }

  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    await this.ensureRatesUpdated();

    const fromRate = this.exchangeRates[fromCurrency];
    const toRate = this.exchangeRates[toCurrency];

    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} or ${toCurrency}`);
    }

    return toRate / fromRate;
  }

  async getSupportedCurrencies(): Promise<string[]> {
    await this.ensureRatesUpdated();
    return Object.keys(this.exchangeRates);
  }

  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }
}

export default CurrencyConverter.getInstance();
