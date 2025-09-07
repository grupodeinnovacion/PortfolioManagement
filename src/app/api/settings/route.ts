import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function GET() {
  try {
    const settings = await localFileStorageService.getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const settingsData = await request.json();
    await localFileStorageService.updateSettings(settingsData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
