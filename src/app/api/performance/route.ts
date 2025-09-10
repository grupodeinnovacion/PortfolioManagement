import { NextRequest, NextResponse } from 'next/server';

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
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "health".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
