import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function GET() {
  try {
    const cashPositions = await localFileStorageService.getCashPositions();
    return NextResponse.json(cashPositions);
  } catch (error) {
    console.error('Error fetching cash positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash positions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { portfolioId, amount } = await request.json();
    await localFileStorageService.updateCashPosition(portfolioId, amount);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cash position:', error);
    return NextResponse.json(
      { error: 'Failed to update cash position' },
      { status: 500 }
    );
  }
}
