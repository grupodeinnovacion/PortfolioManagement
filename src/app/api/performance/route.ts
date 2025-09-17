import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/services/analyticsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'health') {
      // Basic health check with performance metrics
      const startTime = Date.now();

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 1));

      const responseTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        status: 'healthy',
        message: 'Portfolio Management API is running optimally'
      });
    } else if (action === 'analytics') {
      // Performance analytics endpoint
      const portfolioId = searchParams.get('portfolioId') || undefined;
      const timeframe = searchParams.get('timeframe') || '1Y';
      const currency = searchParams.get('currency') || 'USD';

      console.log(`Performance analytics request: portfolioId=${portfolioId}, timeframe=${timeframe}, currency=${currency}`);

      const startTime = Date.now();
      const analytics = await analyticsService.calculatePerformanceAnalytics(
        portfolioId,
        timeframe,
        currency
      );
      const calculationTime = Date.now() - startTime;

      console.log(`Performance analytics calculated in ${calculationTime}ms`);

      const response = NextResponse.json({
        success: true,
        data: analytics,
        metadata: {
          calculationTime: `${calculationTime}ms`,
          timestamp: new Date().toISOString(),
          portfolioId: portfolioId || 'all',
          timeframe,
          currency
        }
      });

      // Add cache headers for better performance
      response.headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      response.headers.set('ETag', `"analytics-${portfolioId || 'all'}-${timeframe}-${Date.now()}"`);

      return response;
    } else if (action === 'cache-stats') {
      // Debug endpoint for cache statistics
      const cacheStats = analyticsService.getCacheStats();

      return NextResponse.json({
        success: true,
        data: cacheStats,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'clear-cache') {
      // Clear analytics cache
      analyticsService.clearCache();

      return NextResponse.json({
        success: true,
        message: 'Analytics cache cleared',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        {
          error: 'Invalid action. Use "health", "analytics", "cache-stats", or "clear-cache".',
          availableParams: {
            action: ['health', 'analytics', 'cache-stats', 'clear-cache'],
            portfolioId: 'string (optional, for specific portfolio analytics)',
            timeframe: ['1M', '3M', '6M', '1Y', '3Y', 'ALL'],
            currency: 'string (default: USD)'
          }
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
