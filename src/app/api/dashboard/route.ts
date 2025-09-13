import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DashboardData } from '@/types/portfolio';
import { realTimeCurrencyService } from '@/services/realTimeCurrencyService';

const DASHBOARD_CACHE_FILE = path.join(process.cwd(), 'data', 'dashboard-cache.json');
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface DashboardCache {
  [currency: string]: {
    data: DashboardData;
    timestamp: number;
  };
}

function readDashboardCache(): DashboardCache {
  try {
    if (fs.existsSync(DASHBOARD_CACHE_FILE)) {
      const content = fs.readFileSync(DASHBOARD_CACHE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading dashboard cache:', error);
  }
  return {};
}

function writeDashboardCache(cache: DashboardCache): void {
  try {
    const dir = path.dirname(DASHBOARD_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DASHBOARD_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error writing dashboard cache:', error);
  }
}

async function generateDashboardData(currency: string): Promise<DashboardData> {
  // Read portfolio and cash position data from JSON
  const [portfolios, cashPositions] = await Promise.all([
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'portfolios.json'), 'utf8')),
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'cash-positions.json'), 'utf8'))
  ]);

  // Fetch holdings data using the existing API (this includes real-time market data)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const allHoldings: any[] = [];
  let totalCashPosition = 0;
  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalUnrealizedPL = 0;
  let totalRealizedPL = 0;
  let totalDailyChange = 0;

  const sectorMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const portfolioValuesMap = new Map<string, number>();

  // Process each portfolio in parallel for better performance
  const portfolioPromises = portfolios.map(async (portfolio: any) => {
    try {
      // Get portfolio cash position and convert to target currency
      const portfolioCash = cashPositions[portfolio.id] || 0;
      const portfolioCurrency = portfolio.currency || 'USD';

      // Get real-time exchange rate for this portfolio's currency to target currency
      const portfolioRate = await realTimeCurrencyService.getExchangeRate(portfolioCurrency, currency);
      const convertedCash = portfolioCash * portfolioRate;

      console.log(`💱 Portfolio ${portfolio.id}: ${portfolioCurrency} → ${currency} rate: ${portfolioRate}`);

      // Read holdings from static JSON file instead of API call
      const holdingsFilePath = path.join(process.cwd(), 'data', 'holdings.json');
      const holdingsData = JSON.parse(fs.readFileSync(holdingsFilePath, 'utf8'));
      const holdings = holdingsData[portfolio.id] || [];

      // Read realized P&L from static JSON file
      const realizedPLFilePath = path.join(process.cwd(), 'data', 'realized-pl.json');
      const realizedPLData = JSON.parse(fs.readFileSync(realizedPLFilePath, 'utf8'));
      const portfolioRealizedPL = realizedPLData[portfolio.id] || 0;

      let portfolioInvested = 0;
      let portfolioCurrentValue = 0;
      let portfolioUnrealizedPL = 0;
      let portfolioDailyChange = 0;

      // Process holdings with proper currency conversion
      for (const holding of holdings) {
        // Get the holding's original currency (should match portfolio currency)
        const holdingCurrency = holding.currency || portfolioCurrency;

        // Get exchange rate for this holding's currency to target currency
        const holdingRate = await realTimeCurrencyService.getExchangeRate(holdingCurrency, currency);

        const convertedHolding = {
          ...holding,
          avgBuyPrice: holding.avgBuyPrice * holdingRate,
          currentPrice: holding.currentPrice * holdingRate,
          currentValue: holding.currentValue * holdingRate,
          investedValue: holding.investedValue * holdingRate,
          unrealizedPL: holding.unrealizedPL * holdingRate,
          dailyChange: holding.dailyChange * holdingRate,
          currency: currency,
          originalCurrency: holdingCurrency,
          exchangeRate: holdingRate
        };

        allHoldings.push(convertedHolding);

        portfolioInvested += convertedHolding.investedValue;
        portfolioCurrentValue += convertedHolding.currentValue;
        portfolioUnrealizedPL += convertedHolding.unrealizedPL;
        portfolioDailyChange += convertedHolding.dailyChange;

        // Add to sector and country allocations
        const sector = holding.sector || 'Other';
        const country = holding.country || 'Unknown';
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + convertedHolding.currentValue);
        countryMap.set(country, (countryMap.get(country) || 0) + convertedHolding.currentValue);
      }

      portfolioValuesMap.set(portfolio.id, portfolioCurrentValue);

      // Convert realized P&L to target currency
      const convertedRealizedPL = portfolioRealizedPL * portfolioRate;

      return {
        cash: convertedCash,
        invested: portfolioInvested,
        currentValue: portfolioCurrentValue,
        unrealizedPL: portfolioUnrealizedPL,
        dailyChange: portfolioDailyChange,
        realizedPL: convertedRealizedPL,
        portfolioName: portfolio.name,
        portfolioCurrency,
        exchangeRate: portfolioRate
      };
    } catch (error) {
      console.error(`Error fetching data for portfolio ${portfolio.id}:`, error);
      return {
        cash: 0,
        invested: 0,
        currentValue: 0,
        unrealizedPL: 0,
        dailyChange: 0,
        realizedPL: 0,
        portfolioName: portfolio.name || 'Unknown',
        portfolioCurrency: portfolio.currency || 'USD',
        exchangeRate: 1
      };
    }
  });

  // Execute all portfolio requests in parallel
  const portfolioResults = await Promise.all(portfolioPromises);

  // Aggregate totals with detailed logging
  console.log(`\n📊 Aggregating portfolio data for ${currency}:`);
  portfolioResults.forEach(result => {
    console.log(`  Portfolio: ${result.portfolioName} (${result.portfolioCurrency} → ${currency}, rate: ${result.exchangeRate})`);
    console.log(`    Cash: ${result.cash.toFixed(2)} ${currency}`);
    console.log(`    Invested: ${result.invested.toFixed(2)} ${currency}`);
    console.log(`    Current Value: ${result.currentValue.toFixed(2)} ${currency}`);
    console.log(`    Daily Change: ${result.dailyChange.toFixed(2)} ${currency}`);

    totalCashPosition += result.cash;
    totalInvested += result.invested;
    totalCurrentValue += result.currentValue;
    totalUnrealizedPL += result.unrealizedPL;
    totalDailyChange += result.dailyChange;
    totalRealizedPL += result.realizedPL;
  });

  console.log(`\n💰 Final aggregated totals in ${currency}:`);
  console.log(`  Total Cash: ${totalCashPosition.toFixed(2)} ${currency}`);
  console.log(`  Total Invested: ${totalInvested.toFixed(2)} ${currency}`);
  console.log(`  Total Current Value: ${totalCurrentValue.toFixed(2)} ${currency}`);
  console.log(`  Total Daily Change: ${totalDailyChange.toFixed(2)} ${currency}`);
  console.log(`  Total Unrealized P&L: ${totalUnrealizedPL.toFixed(2)} ${currency}`);
  console.log(`  Total Realized P&L: ${totalRealizedPL.toFixed(2)} ${currency}`);

  // Create portfolio allocations
  const portfolioAllocations = portfolios.map((portfolio: any) => {
    const value = portfolioValuesMap.get(portfolio.id) || 0;
    return {
      name: portfolio.name,
      value,
      percentage: totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0
    };
  });

  // Create sector allocations
  const sectorAllocations = Array.from(sectorMap.entries()).map(([name, value]) => ({
    name,
    value,
    percentage: totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0
  }));

  // Create country allocations
  const countryAllocations = Array.from(countryMap.entries()).map(([name, value]) => ({
    name,
    value,
    percentage: totalCurrentValue > 0 ? (value / totalCurrentValue) * 100 : 0
  }));

  const totalPL = totalUnrealizedPL + totalRealizedPL;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const previousDayValue = totalCurrentValue - totalDailyChange;
  const dailyChangePercent = previousDayValue > 0 ? (totalDailyChange / previousDayValue) * 100 : 0;

  // Get top holdings
  const topHoldings = allHoldings
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 10);

  return {
    totalInvested,
    totalCurrentValue,
    totalCashPosition,
    totalPL,
    totalPLPercent,
    totalUnrealizedPL,
    totalRealizedPL,
    dailyChange: totalDailyChange,
    dailyChangePercent,
    xirr: 15.5, // Mock XIRR
    availableCashPosition: totalCashPosition * 0.9,
    allocations: portfolioAllocations,
    sectorAllocations,
    countryAllocations,
    currencyAllocations: [], // Add if needed
    topHoldings,
    topGainers: topHoldings.filter(h => h.unrealizedPLPercent > 0).slice(0, 5),
    topLosers: topHoldings.filter(h => h.unrealizedPLPercent < 0).slice(0, 5),
    lastUpdated: new Date().toISOString()
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'USD';
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cache = readDashboardCache();
    const now = Date.now();

    // Check if we have valid cached data
    if (!forceRefresh && cache[currency] && (now - cache[currency].timestamp) < CACHE_DURATION) {
      console.log(`✅ Serving cached dashboard data for ${currency}`);
      return NextResponse.json(cache[currency].data);
    }

    console.log(`🔄 Generating fresh dashboard data for ${currency}...`);
    const dashboardData = await generateDashboardData(currency);

    // Update cache
    cache[currency] = {
      data: dashboardData,
      timestamp: now
    };
    writeDashboardCache(cache);

    console.log(`✅ Dashboard data cached for ${currency}`);
    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error generating dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Force refresh dashboard cache
    const body = await request.json();
    const currency = body.currency || 'USD';

    console.log(`🔄 Force refreshing dashboard cache for ${currency}...`);
    const dashboardData = await generateDashboardData(currency);

    const cache = readDashboardCache();
    cache[currency] = {
      data: dashboardData,
      timestamp: Date.now()
    };
    writeDashboardCache(cache);

    return NextResponse.json({
      success: true,
      message: `Dashboard cache refreshed for ${currency}`,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error refreshing dashboard cache:', error);
    return NextResponse.json(
      { error: 'Failed to refresh dashboard cache' },
      { status: 500 }
    );
  }
}