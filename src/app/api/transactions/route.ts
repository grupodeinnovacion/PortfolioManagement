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
