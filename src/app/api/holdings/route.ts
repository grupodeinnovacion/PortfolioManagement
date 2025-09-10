import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';
import { serverEnhancedCacheService } from '@/services/serverEnhancedCacheService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }
    
    const cacheKey = serverEnhancedCacheService.generateKey('holdings', portfolioId);
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedHoldings = serverEnhancedCacheService.get(cacheKey);
      if (cachedHoldings) {
        console.log(`✅ Serving cached holdings for portfolio ${portfolioId}`);
        
        const response = NextResponse.json(cachedHoldings);
        
        // Set cache headers for 30 minutes with stale-while-revalidate
        response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
        response.headers.set('X-Cache-Status', 'HIT');
        response.headers.set('X-Cache-Age', Math.round((Date.now() - (serverEnhancedCacheService.getCacheAge(cacheKey) || 0)) / 1000).toString());
        
        return response;
      }
    }
    
    console.log(`📊 ${forceRefresh ? 'Force refreshing' : 'Calculating'} holdings for portfolio: ${portfolioId}`);
    const holdings = await localFileStorageService.calculateHoldings(portfolioId, true); // Always use real-time for fresh data
    
    // Cache the results
    serverEnhancedCacheService.set(cacheKey, holdings);
    
    // Update portfolio totals and timestamp when holdings are fetched
    await localFileStorageService.updatePortfolioTotals(portfolioId);
    
    const response = NextResponse.json(holdings);
    
    // Set cache headers for 30 minutes
    response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    response.headers.set('X-Cache-Status', 'MISS');
    response.headers.set('ETag', `"holdings-${portfolioId}-${Date.now()}"`);
    response.headers.set('Last-Modified', new Date().toUTCString());
    
    console.log(`Holdings calculated: ${holdings.length} holdings found and cached for 30 minutes`);
    return response;
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
