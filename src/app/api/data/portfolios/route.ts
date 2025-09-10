import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'portfolios.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const portfolios = JSON.parse(data);
    
    return NextResponse.json(portfolios);
  } catch (error) {
    console.error('Error reading portfolios.json:', error);
    return NextResponse.json({ error: 'Failed to read portfolios data' }, { status: 500 });
  }
}
