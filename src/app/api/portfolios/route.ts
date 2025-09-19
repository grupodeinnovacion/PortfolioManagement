import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function GET() {
  try {
    const portfolios = await localFileStorageService.getPortfolios();
    const response = NextResponse.json(portfolios);
    
    // Prevent caching to ensure fresh timestamps
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const portfolioData = await request.json();
    const newPortfolio = await localFileStorageService.createPortfolio(portfolioData);
    return NextResponse.json(newPortfolio, { status: 201 });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');
    const forceDelete = searchParams.get('force') === 'true';

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    // Get portfolio transactions count for user info
    const transactions = await localFileStorageService.getTransactions();
    const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolioId && !t.deleted);

    if (!forceDelete && portfolioTransactions.length > 0) {
      return NextResponse.json(
        {
          error: 'Portfolio has existing transactions. Use force delete to proceed.',
          transactionCount: portfolioTransactions.length,
          requiresForce: true
        },
        { status: 409 }
      );
    }

    // Soft delete the portfolio
    await localFileStorageService.softDeletePortfolio(portfolioId);

    // If force delete, also soft delete associated transactions
    if (forceDelete && portfolioTransactions.length > 0) {
      await localFileStorageService.softDeletePortfolioTransactions(portfolioId);
    }

    return NextResponse.json({
      success: true,
      deletedTransactions: forceDelete ? portfolioTransactions.length : 0
    });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}
