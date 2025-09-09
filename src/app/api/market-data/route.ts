import { NextRequest, NextResponse } from 'next/server';
import { marketDataService } from '@/services/marketDataService';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');
    
    // Check if request body has a symbol for individual quote
    const body = await request.json().catch(() => ({}));
    const symbol = body.symbol;
    
    if (symbol) {
      // Get quote for specific symbol
      console.log(`Fetching individual quote for: ${symbol}`);
      const quote = await marketDataService.getStockQuote(symbol);
      
      if (!quote.success) {
        return NextResponse.json(
          { error: `Failed to fetch market data for symbol: ${symbol}` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(quote);
      
    } else if (portfolioId) {
      // Refresh data for a specific portfolio
      console.log(`Refreshing market data for portfolio: ${portfolioId}`);
      
      // Get all holdings for this portfolio
      const holdings = await localFileStorageService.calculateHoldings(portfolioId);
      const symbols = holdings.map(h => h.ticker);
      
      if (symbols.length === 0) {
        return NextResponse.json({ 
          message: 'No holdings found to refresh',
          updatedCount: 0
        });
      }
      
      // Fetch fresh market data
      const quotes = await marketDataService.getMultipleQuotes(symbols);
      
      return NextResponse.json({ 
        message: `Market data refreshed for ${portfolioId}`,
        updatedCount: Object.keys(quotes).length,
        symbols: Object.keys(quotes),
        lastUpdated: new Date().toISOString()
      });
      
    } else {
      // Clear cache to force fresh data on next request
      console.log('Clearing market data cache...');
      
      marketDataService.clearCache();
      
      return NextResponse.json({ 
        message: 'Market data cache cleared',
        lastUpdated: new Date().toISOString(),
        cacheStatus: marketDataService.getCacheStats()
      });
    }
    
  } catch (error) {
    console.error('Error refreshing market data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh market data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const portfolioId = searchParams.get('portfolioId');
    const country = searchParams.get('country');
    const currency = searchParams.get('currency');
    
    if (!symbol) {
      // Return cache status
      return NextResponse.json({
        cacheStatus: marketDataService.getCacheStats(),
        message: 'Market data cache status'
      });
    }

    // If portfolio context is provided, get portfolio details for exchange-specific fetching
    let portfolioContext = null;
    if (portfolioId) {
      const portfolios = await localFileStorageService.getPortfolios();
      portfolioContext = portfolios.find(p => p.id === portfolioId);
    } else if (country && currency) {
      portfolioContext = { country, currency };
    }
    
    // Get quote for specific symbol with portfolio context
    const quote = await marketDataService.getStockQuote(symbol, portfolioContext);
    
    if (!quote) {
      return NextResponse.json(
        { error: `No market data found for symbol: ${symbol}` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(quote);
    
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch market data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
