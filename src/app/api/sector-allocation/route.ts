import { NextRequest, NextResponse } from 'next/server';
import { marketDataService } from '@/services/marketDataService';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    if (portfolioId) {
      // Get sector allocation for a specific portfolio
      const holdings = await localFileStorageService.calculateHoldings(portfolioId);
      const sectorAllocation = await calculatePortfolioSectorAllocation(holdings);
      
      return NextResponse.json({
        success: true,
        data: sectorAllocation,
        portfolioId
      });
    } else {
      // Get overall sector allocation across all portfolios
      const portfolios = await localFileStorageService.getPortfolios();
      let allHoldings: any[] = [];
      
      for (const portfolio of portfolios) {
        const holdings = await localFileStorageService.calculateHoldings(portfolio.id);
        allHoldings = allHoldings.concat(holdings);
      }
      
      const sectorAllocation = await calculatePortfolioSectorAllocation(allHoldings);
      
      return NextResponse.json({
        success: true,
        data: sectorAllocation,
        portfolioId: 'all'
      });
    }
  } catch (error) {
    console.error('Error getting sector allocation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get sector allocation'
    }, { status: 500 });
  }
}

async function calculatePortfolioSectorAllocation(holdings: any[]) {
  const sectorValues: Record<string, number> = {};
  let totalValue = 0;

  for (const holding of holdings) {
    try {
      // Use sector from holding directly (it's already populated from market data)
      // Fallback to stored stock info if needed
      const symbol = holding.ticker || holding.symbol;
      const sector = holding.sector || 'Unknown';

      // Use currentValue directly from holdings calculation for consistency
      const value = holding.currentValue || (holding.quantity * holding.currentPrice);
      sectorValues[sector] = (sectorValues[sector] || 0) + value;
      totalValue += value;

      console.log(`Processing ${symbol}: ${sector} - $${value.toFixed(2)}`);
    } catch (error) {
      console.error(`Error processing holding ${holding.ticker || holding.symbol}:`, error);
    }
  }

  // Convert to percentages and format for chart
  const sectorAllocation = Object.entries(sectorValues).map(([sector, value]) => ({
    name: sector, // Use 'name' for consistency with AllocationItem interface
    value,
    percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
  })).sort((a, b) => b.value - a.value);

  return {
    sectors: sectorAllocation,
    totalValue,
    lastUpdated: new Date().toISOString()
  };
}
