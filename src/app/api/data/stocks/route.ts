import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'stocks.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const stocks = JSON.parse(data);
    
    return NextResponse.json(stocks);
  } catch (error) {
    console.error('Error reading stocks.json:', error);
    return NextResponse.json({ error: 'Failed to read stocks data' }, { status: 500 });
  }
}
