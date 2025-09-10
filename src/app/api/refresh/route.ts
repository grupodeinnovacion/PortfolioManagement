import { NextRequest, NextResponse } from 'next/server';
import { marketDataService } from '@/services/marketDataService';
import { localFileStorageService } from '@/services/localFileStorageService';
import { realTimeCurrencyService } from '@/services/realTimeCurrencyService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting comprehensive data refresh...');
    
    const startTime = Date.now();
    const results = {
      stocksUpdated: 0,
      currencyRatesUpdated: 0,
      portfoliosRefreshed: 0,
      errors: [] as string[],
      summary: {} as any
    };

    // Step 1: Get all portfolios and collect unique symbols
    console.log('📊 Collecting portfolio data...');
    const portfolios = await localFileStorageService.getPortfolios();
    const allSymbols = new Set<string>();
    
    for (const portfolio of portfolios) {
      try {
        const holdings = await localFileStorageService.calculateHoldings(portfolio.id, false); // Don't use real-time to avoid double-fetching
        holdings.forEach(holding => allSymbols.add(holding.ticker));
      } catch (error) {
        results.errors.push(`Failed to get holdings for portfolio ${portfolio.id}: ${error}`);
      }
    }

    const symbolsList = Array.from(allSymbols);
    console.log(`📈 Found ${symbolsList.length} unique symbols: ${symbolsList.join(', ')}`);

    // Step 2: Clear market data cache to force fresh data
    marketDataService.clearCache();
    console.log('🗑️ Market data cache cleared');

    // Step 3: Fetch fresh market data for all symbols
    console.log('💰 Fetching fresh market data...');
    const marketDataPromises = symbolsList.map(async (symbol) => {
      try {
        const quote = await marketDataService.getStockQuote(symbol);
        if (quote.success) {
          results.stocksUpdated++;
          return { symbol, success: true, data: quote.data };
        } else {
          results.errors.push(`Failed to fetch data for ${symbol}`);
          return { symbol, success: false, error: 'No data' };
        }
      } catch (error) {
        results.errors.push(`Error fetching ${symbol}: ${error}`);
        return { symbol, success: false, error: error };
      }
    });

    const marketDataResults = await Promise.allSettled(marketDataPromises);
    const successfulStocks = marketDataResults
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => (result as any).value);

    // Step 4: Refresh currency rates
    console.log('💱 Refreshing currency rates...');
    try {
      await realTimeCurrencyService.clearCache();
      // Fetch common currency pairs to populate cache
      const commonPairs = ['USD/EUR', 'USD/GBP', 'USD/JPY', 'USD/INR', 'EUR/GBP'];
      
      for (const pair of commonPairs) {
        const [from, to] = pair.split('/');
        try {
          await realTimeCurrencyService.getExchangeRate(from, to);
          results.currencyRatesUpdated++;
        } catch (error) {
          results.errors.push(`Failed to refresh ${pair}: ${error}`);
        }
      }
    } catch (error) {
      results.errors.push(`Currency refresh error: ${error}`);
    }

    // Step 5: Refresh all portfolio calculations with new data
    console.log('🔄 Refreshing portfolio calculations...');
    for (const portfolio of portfolios) {
      try {
        // This will use the fresh market data we just fetched
        await localFileStorageService.calculateHoldings(portfolio.id, true);
        // Update portfolio totals to persist the real-time calculations
        await localFileStorageService.updatePortfolioTotals(portfolio.id);
        results.portfoliosRefreshed++;
      } catch (error) {
        results.errors.push(`Failed to refresh portfolio ${portfolio.id}: ${error}`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Step 6: Prepare summary
    results.summary = {
      totalSymbols: symbolsList.length,
      successfulStocks: successfulStocks.length,
      stockPrices: successfulStocks.reduce((acc, stock) => {
        acc[stock.symbol] = {
          price: stock.data.price,
          change: stock.data.changePercent.toFixed(2) + '%',
          company: stock.data.companyName,
          sector: stock.data.sector
        };
        return acc;
      }, {} as any),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Refresh completed in ${duration}ms`);
    console.log(`📊 Updated: ${results.stocksUpdated} stocks, ${results.currencyRatesUpdated} currency rates, ${results.portfoliosRefreshed} portfolios`);

    return NextResponse.json({
      success: true,
      message: 'Comprehensive data refresh completed successfully',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Comprehensive refresh failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Comprehensive refresh failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return refresh status and last update times
    const stocks = await marketDataService.getAllStoredStocks();
    const portfolios = await localFileStorageService.getPortfolios();
    
    return NextResponse.json({
      success: true,
      status: {
        stocksCount: stocks.length,
        portfoliosCount: portfolios.length,
        lastStockUpdate: stocks.length > 0 ? Math.max(...stocks.map(s => new Date(s.lastUpdated).getTime())) : null,
        cacheStats: marketDataService.getCacheStats()
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get refresh status'
    }, { status: 500 });
  }
}
