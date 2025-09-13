import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    console.log(`📊 Reading static realized P&L data for portfolio: ${portfolioId}`);

    // Read static realized P&L data from JSON file
    const realizedPLFilePath = path.join(process.cwd(), 'data', 'realized-pl.json');
    const realizedPLData = JSON.parse(fs.readFileSync(realizedPLFilePath, 'utf8'));

    // Get realized P&L for the specific portfolio or total if no portfolio specified
    const realizedPL = portfolioId ? (realizedPLData[portfolioId] || 0) :
      Object.keys(realizedPLData)
        .filter(key => key !== 'lastUpdated')
        .reduce((total, key) => total + (realizedPLData[key] || 0), 0);

    console.log(`✅ Static realized P&L data served: ${realizedPL}`);
    return NextResponse.json({ realizedPL });
  } catch (error) {
    console.error('Error reading static realized P&L data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realized P&L' },
      { status: 500 }
    );
  }
}
