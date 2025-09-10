import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'cash-positions.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const cashPositions = JSON.parse(data);
    
    return NextResponse.json(cashPositions);
  } catch (error) {
    console.error('Error reading cash-positions.json:', error);
    return NextResponse.json({ error: 'Failed to read cash positions data' }, { status: 500 });
  }
}
