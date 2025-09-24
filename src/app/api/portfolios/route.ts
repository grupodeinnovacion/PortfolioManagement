import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';
import { logApi, logError, logPortfolio } from '@/lib/logger';

export async function GET() {
  const startTime = Date.now();
  try {
    logApi('GET', '/api/portfolios');
    const portfolios = await localFileStorageService.getPortfolios();
    const response = NextResponse.json(portfolios);

    // Prevent caching to ensure fresh timestamps
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    const duration = Date.now() - startTime;
    logApi('GET', '/api/portfolios', 200, duration);
    logPortfolio(`Retrieved ${portfolios.length} portfolios`);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error fetching portfolios', error, 'API:/api/portfolios');
    logApi('GET', '/api/portfolios', 500, duration);
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    logApi('POST', '/api/portfolios');
    const portfolioData = await request.json();
    const newPortfolio = await localFileStorageService.createPortfolio(portfolioData);

    const duration = Date.now() - startTime;
    logApi('POST', '/api/portfolios', 201, duration);
    logPortfolio(`Created new portfolio: ${newPortfolio.name}`, newPortfolio.id);
    return NextResponse.json(newPortfolio, { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error creating portfolio', error, 'API:/api/portfolios');
    logApi('POST', '/api/portfolios', 500, duration);
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');
    const forceDelete = searchParams.get('force') === 'true';

    logApi('DELETE', `/api/portfolios?portfolioId=${portfolioId}&force=${forceDelete}`);

    if (!portfolioId) {
      const duration = Date.now() - startTime;
      logApi('DELETE', '/api/portfolios', 400, duration);
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    // Get portfolio transactions count for user info
    const transactions = await localFileStorageService.getTransactions();
    const portfolioTransactions = transactions.filter(t => t.portfolioId === portfolioId && !t.deleted);

    if (!forceDelete && portfolioTransactions.length > 0) {
      const duration = Date.now() - startTime;
      logApi('DELETE', '/api/portfolios', 409, duration);
      logPortfolio(`Delete blocked: ${portfolioTransactions.length} transactions exist`, portfolioId);
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
      logPortfolio(`Force deleted with ${portfolioTransactions.length} transactions`, portfolioId);
    } else {
      logPortfolio(`Soft deleted successfully`, portfolioId);
    }

    const duration = Date.now() - startTime;
    logApi('DELETE', '/api/portfolios', 200, duration);
    return NextResponse.json({
      success: true,
      deletedTransactions: forceDelete ? portfolioTransactions.length : 0
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error deleting portfolio', error, 'API:/api/portfolios');
    logApi('DELETE', '/api/portfolios', 500, duration);
    return NextResponse.json(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}
