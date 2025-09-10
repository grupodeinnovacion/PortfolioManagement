import { NextRequest, NextResponse } from 'next/server';
import { marketDataService } from '@/services/marketDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      // Get cache statistics
      const stats = marketDataService.getCacheStats();
      return NextResponse.json({
        success: true,
        data: stats
      });
    } else if (action === 'clear') {
      // Clear cache
      marketDataService.clearCache();
      return NextResponse.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "stats" or "clear".' },
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
