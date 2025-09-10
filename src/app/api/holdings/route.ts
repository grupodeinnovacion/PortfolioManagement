import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');
    
    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }
    
    const holdings = await localFileStorageService.calculateHoldings(portfolioId);
    
    // Update portfolio totals and timestamp when holdings are fetched
    await localFileStorageService.updatePortfolioTotals(portfolioId);
    
    const response = NextResponse.json(holdings);
    
    // Add cache-friendly headers while ensuring data freshness
    // Allow caching for 2 minutes to balance performance and data accuracy
    response.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    response.headers.set('ETag', `"holdings-${portfolioId}-${Date.now()}"`);
    response.headers.set('Last-Modified', new Date().toUTCString());
    
    return response;
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
