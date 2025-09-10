import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';
import { serverEnhancedCacheService } from '@/services/serverEnhancedCacheService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    const cacheKey = serverEnhancedCacheService.generateKey('realized_pl', portfolioId || 'all');
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedPL = serverEnhancedCacheService.get(cacheKey);
      if (cachedPL !== null) {
        console.log(`✅ Serving cached realized P&L for ${portfolioId || 'all portfolios'}`);
        
        const response = NextResponse.json({ realizedPL: cachedPL });
        
        // Set cache headers for 30 minutes
        response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
        response.headers.set('X-Cache-Status', 'HIT');
        
        return response;
      }
    }
    
    console.log(`📊 ${forceRefresh ? 'Force refreshing' : 'Calculating'} realized P&L for ${portfolioId || 'all portfolios'}`);
    const realizedPL = await localFileStorageService.calculateRealizedPL(portfolioId || undefined);
    
    // Cache the results
    serverEnhancedCacheService.set(cacheKey, realizedPL);
    
    const response = NextResponse.json({ realizedPL });
    
    // Set cache headers for 30 minutes
    response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    response.headers.set('X-Cache-Status', 'MISS');
    response.headers.set('Last-Modified', new Date().toUTCString());
    
    console.log(`✅ Realized P&L calculated and cached: ${realizedPL}`);
    return response;
  } catch (error) {
    console.error('Error calculating realized P&L:', error);
    return NextResponse.json(
      { error: 'Failed to calculate realized P&L' },
      { status: 500 }
    );
  }
}
