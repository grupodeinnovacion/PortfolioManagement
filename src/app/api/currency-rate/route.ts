import { NextRequest, NextResponse } from 'next/server';
import { serverEnhancedCacheService } from '@/services/serverEnhancedCacheService';

// Fallback exchange rates (updated September 2025)
const FALLBACK_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1, INR: 88.23, EUR: 0.90, GBP: 0.76 },
  INR: { USD: 0.012, INR: 1, EUR: 0.0102, GBP: 0.0088 },
  EUR: { USD: 1.18, INR: 98.35, EUR: 1, GBP: 0.86 },
  GBP: { USD: 1.37, INR: 113.89, EUR: 1.16, GBP: 1 }
};

async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1;

  const cacheKey = serverEnhancedCacheService.generateKey('exchange_rates', fromCurrency.toUpperCase());
  
  // Check cache first
  const cachedRates = serverEnhancedCacheService.get<Record<string, number>>(cacheKey);
  if (cachedRates && cachedRates[toCurrency.toUpperCase()]) {
    return cachedRates[toCurrency.toUpperCase()];
  }

  // If not in cache, try to fetch from external API
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    if (response.ok) {
      const data = await response.json();
      const rates = data.conversion_rates || data.rates;
      if (rates) {
        // Cache the rates for 30 minutes
        serverEnhancedCacheService.set(cacheKey, rates);
        return rates[toCurrency.toUpperCase()] || 1;
      }
    }
  } catch (error) {
    console.error('Failed to fetch live exchange rates:', error);
  }

  // Fallback to static rates
  return FALLBACK_EXCHANGE_RATES[fromCurrency.toUpperCase()]?.[toCurrency.toUpperCase()] || 1;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get('from') || 'USD';
    const toCurrency = searchParams.get('to') || 'USD';

    const rate = await getExchangeRate(fromCurrency, toCurrency);

    return NextResponse.json({ 
      rate,
      fromCurrency,
      toCurrency,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching currency rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currency rate', rate: 1 },
      { status: 500 }
    );
  }
}
