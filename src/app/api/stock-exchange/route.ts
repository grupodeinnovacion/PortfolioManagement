import { NextResponse } from 'next/server';

// Country-specific exchanges
const COUNTRY_EXCHANGES: Record<string, string[]> = {
  'India': ['NSE', 'BSE'],
  'USA': ['NYSE', 'NASDAQ']
};

// Known Indian stocks for fallback
const INDIAN_STOCKS: Record<string, string> = {
  'TCS': 'TCS:NSE',
  'INFY': 'INFY:NSE', 
  'RELIANCE': 'RELIANCE:NSE',
  'HDFCBANK': 'HDFCBANK:NSE',
  'ICICIBANK': 'ICICIBANK:NSE',
  'BHARTIARTL': 'BHARTIARTL:NSE',
  'ITC': 'ITC:NSE',
  'SBIN': 'SBIN:NSE',
  'LT': 'LT:NSE',
  'HCLTECH': 'HCLTECH:NSE'
};

// Dynamically detect exchange from Yahoo Finance
async function getExchangeFromYahoo(symbol: string): Promise<string | null> {
  try {
    // Try US exchanges first
    const usSymbolUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const usResponse = await fetch(usSymbolUrl);
    
    if (usResponse.ok) {
      const usData = await usResponse.json();
      const usChart = usData.chart?.result?.[0];
      if (usChart?.meta?.exchangeName) {
        const exchangeName = usChart.meta.exchangeName.toUpperCase();
        // Map Yahoo Finance exchange names to our standard names
        if (exchangeName.includes('NASDAQ')) return 'NASDAQ';
        if (exchangeName.includes('NYSE')) return 'NYSE';
        if (exchangeName.includes('NSE')) return 'NSE';
        if (exchangeName.includes('BSE')) return 'BSE';
      }
    }
    
    // Try NSE if US didn't work
    const nseSymbolUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS`;
    const nseResponse = await fetch(nseSymbolUrl);
    
    if (nseResponse.ok) {
      const nseData = await nseResponse.json();
      const nseChart = nseData.chart?.result?.[0];
      if (nseChart?.meta?.regularMarketPrice) {
        return 'NSE';
      }
    }
    
    // Try BSE
    const bseSymbolUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.BO`;
    const bseResponse = await fetch(bseSymbolUrl);
    
    if (bseResponse.ok) {
      const bseData = await bseResponse.json();
      const bseChart = bseData.chart?.result?.[0];
      if (bseChart?.meta?.regularMarketPrice) {
        return 'BSE';
      }
    }
    
    return null;
  } catch (error) {
    console.log(`Error fetching exchange info for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const country = searchParams.get('country');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Dynamically detect the exchange where the stock is listed
    let exchange = await getExchangeFromYahoo(symbol.toUpperCase());
    
    if (!exchange) {
      // Fallback: Try to determine from symbol patterns or known Indian stocks
      if (INDIAN_STOCKS.hasOwnProperty(symbol.toUpperCase())) {
        exchange = 'NSE'; // Default to NSE for known Indian stocks
      } else {
        exchange = 'NASDAQ'; // Default to NASDAQ for unknown stocks
      }
    }
    
    // Get available exchanges for the country
    const countryExchanges = country ? COUNTRY_EXCHANGES[country] || ['NASDAQ'] : [];

    return NextResponse.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        exchange,
        countryExchanges,
        isIndianStock: exchange === 'NSE' || exchange === 'BSE',
        isUSStock: exchange === 'NYSE' || exchange === 'NASDAQ'
      }
    });
  } catch (error) {
    console.error('Error getting stock exchange info:', error);
    return NextResponse.json({ error: 'Failed to get stock exchange info' }, { status: 500 });
  }
}
