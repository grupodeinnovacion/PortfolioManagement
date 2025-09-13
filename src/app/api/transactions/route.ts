import { NextRequest, NextResponse } from 'next/server';
import { localFileStorageService } from '@/services/localFileStorageService';

export async function GET() {
  try {
    const transactions = await localFileStorageService.getTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const transactionData = await request.json();
    console.log('Adding transaction:', transactionData.ticker, transactionData.action, transactionData.quantity);

    const newTransaction = await localFileStorageService.addTransaction(transactionData);

    // Refresh dashboard cache after transaction to keep data in sync
    try {
      const refreshResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/dashboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency: 'USD' }),
      });

      if (refreshResponse.ok) {
        console.log('✅ Dashboard cache refreshed after transaction');
      }
    } catch (refreshError) {
      console.warn('Failed to refresh dashboard cache:', refreshError);
      // Don't fail the transaction if cache refresh fails
    }

    const response = NextResponse.json(newTransaction, { status: 201 });

    // Add cache-busting headers to ensure fresh data after transaction
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    console.log('Transaction added successfully:', newTransaction.id);
    return response;
  } catch (error) {
    console.error('Error creating transaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
