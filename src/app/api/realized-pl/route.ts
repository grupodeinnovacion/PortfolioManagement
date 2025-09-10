import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');
    
    const realizedPL = await localFileStorageService.calculateRealizedPL(portfolioId || undefined);
    
    return NextResponse.json({ realizedPL });
  } catch (error) {
    console.error('Error calculating realized P&L:', error);
    return NextResponse.json(
      { error: 'Failed to calculate realized P&L' },
      { status: 500 }
    );
  }
}
