import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();
  
  return NextResponse.json({
    serverTime: {
      iso: now.toISOString(),
      string: now.toString(),
      locale: now.toLocaleString(),
      timestamp: now.getTime(),
      formatted: now.toISOString().slice(0, 16)
    },
    timezone: {
      offset: now.getTimezoneOffset(),
      name: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  });
}
