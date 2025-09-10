import { NextRequest, NextResponse } from 'next/server';
import { marketDataService } from '@/services/marketDataService';
import { serverEnhancedCacheService } from '@/services/serverEnhancedCacheService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      // Get comprehensive cache statistics
      const stats = marketDataService.getCacheStats();
      return NextResponse.json({
        success: true,
        data: stats,
        message: 'Cache statistics retrieved successfully'
      });
    } else if (action === 'clear') {
      // Clear all cache
      marketDataService.clearCache();
      return NextResponse.json({
        success: true,
        message: 'All cache cleared successfully'
      });
    } else if (action === 'force-refresh') {
      // Mark global refresh (clears cache and forces fresh data on next request)
      marketDataService.forceRefreshAll();
      return NextResponse.json({
        success: true,
        message: 'Cache marked for force refresh - next API calls will fetch fresh data'
      });
    } else if (action === 'cleanup') {
      // Clean up expired entries
      serverEnhancedCacheService.cleanup();
      const stats = marketDataService.getCacheStats();
      return NextResponse.json({
        success: true,
        data: stats,
        message: 'Expired cache entries cleaned up'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "stats", "clear", "force-refresh", or "cleanup".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Cache API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
