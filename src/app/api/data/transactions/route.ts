import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'transactions.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const transactions = JSON.parse(data);
    
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error reading transactions.json:', error);
    return NextResponse.json({ error: 'Failed to read transactions data' }, { status: 500 });
  }
}
