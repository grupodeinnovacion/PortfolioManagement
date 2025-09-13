import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Reading static holdings data for portfolio: ${portfolioId}`);

    // Read static holdings data from JSON file
    const holdingsFilePath = path.join(process.cwd(), 'data', 'holdings.json');
    const holdingsData = JSON.parse(fs.readFileSync(holdingsFilePath, 'utf8'));

    // Get holdings for the specific portfolio
    const portfolioHoldings = holdingsData[portfolioId] || [];

    const response = NextResponse.json(portfolioHoldings);

    // Add cache headers for static data
    response.headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    response.headers.set('Last-Modified', holdingsData.lastUpdated || new Date().toUTCString());

    console.log(`✅ Static holdings data served: ${portfolioHoldings.length} holdings found`);
    return response;
  } catch (error) {
    console.error('Error reading static holdings data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
