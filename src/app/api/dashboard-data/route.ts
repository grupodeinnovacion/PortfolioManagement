import { NextRequest, NextResponse } from 'next/server';
import { portfolioService } from '@/services/portfolioService';
import { serverEnhancedCacheService } from '@/services/serverEnhancedCacheService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'USD';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    const cacheKey = serverEnhancedCacheService.generateKey('dashboard_data', currency);
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = serverEnhancedCacheService.get(cacheKey);
      if (cachedData) {
        console.log(`✅ Serving cached dashboard data for currency ${currency}`);
        
        const response = NextResponse.json(cachedData);
        
        // Set cache headers for 30 minutes with stale-while-revalidate
        response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
        response.headers.set('X-Cache-Status', 'HIT');
        response.headers.set('X-Cache-Age', Math.round((Date.now() - (serverEnhancedCacheService.getCacheAge(cacheKey) || 0)) / 1000).toString());
        
        return response;
      }
    }
    
    console.log(`📊 ${forceRefresh ? 'Force refreshing' : 'Calculating'} dashboard data for currency: ${currency}`);
    const startTime = Date.now();
    
    const dashboardData = await portfolioService.getDashboardData(currency);
    
    // Cache the results
    serverEnhancedCacheService.set(cacheKey, dashboardData);
    
    const duration = Date.now() - startTime;
    
    const response = NextResponse.json(dashboardData);
    
    // Set cache headers for 30 minutes
    response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    response.headers.set('X-Cache-Status', 'MISS');
    response.headers.set('X-Calculation-Time', `${duration}ms`);
    response.headers.set('ETag', `"dashboard-${currency}-${Date.now()}"`);
    response.headers.set('Last-Modified', new Date().toUTCString());
    
    console.log(`✅ Dashboard data calculated and cached for ${currency} in ${duration}ms`);
    return response;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
