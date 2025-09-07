import { NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function POST() {
  try {
    await localFileStorageService.syncPortfoliosCashPositions();
    return NextResponse.json({ 
      success: true, 
      message: 'Cash positions synchronized successfully' 
    });
  } catch (error) {
    console.error('Error synchronizing cash positions:', error);
    return NextResponse.json(
      { error: 'Failed to synchronize cash positions' },
      { status: 500 }
    );
  }
}
