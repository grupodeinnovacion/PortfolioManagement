import { NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function GET() {
  try {
    const userActions = await localFileStorageService.getUserActions();
    return NextResponse.json(userActions);
  } catch (error) {
    console.error('Error fetching user actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user actions' },
      { status: 500 }
    );
  }
}
