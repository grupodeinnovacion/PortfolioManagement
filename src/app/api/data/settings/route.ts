import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'settings.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const settings = JSON.parse(data);
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error reading settings.json:', error);
    return NextResponse.json({ error: 'Failed to read settings data' }, { status: 500 });
  }
}
