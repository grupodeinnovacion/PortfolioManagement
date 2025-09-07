'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { CompactCurrencyRate } from '@/components/CurrencyRateDisplay';
import { ArrowLeft, Save, Calculator } from 'lucide-react';
import Link from 'next/link';
import { TransactionFormData } from '@/types/portfolio';

function AddTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portfolioId = searchParams.get('portfolio') || '';

  const [formData, setFormData] = useState<TransactionFormData>({
    portfolioId: portfolioId,
    date: new Date().toISOString().slice(0, 16), // Include time in format YYYY-MM-DDTHH:mm
    action: 'BUY',
    ticker: '',
    exchange: 'NASDAQ',
    quantity: 0,
    tradePrice: 0,
    currency: 'USD',
    fees: 0,
    notes: '',
    tag: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const portfolioOptions = [
    { id: 'usa-alpha', name: 'USA Alpha Fund', currency: 'USD' },
    { id: 'usa-sip', name: 'USA SIP', currency: 'USD' },
    { id: 'india-investments', name: 'India Investments', currency: 'INR' }
  ];

  const exchangeOptions = [
    { value: 'NASDAQ', label: 'NASDAQ', country: 'USA' },
    { value: 'NYSE', label: 'NYSE', country: 'USA' },
    { value: 'NSE', label: 'NSE', country: 'India' },
    { value: 'BSE', label: 'BSE', country: 'India' },
    { value: 'LSE', label: 'LSE', country: 'UK' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.portfolioId) {
      newErrors.portfolioId = 'Portfolio is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.ticker.trim()) {
      newErrors.ticker = 'Ticker is required';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (formData.tradePrice <= 0) {
      newErrors.tradePrice = 'Price must be greater than 0';
    }
    if (formData.fees < 0) {
      newErrors.fees = 'Fees cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the transaction object with proper types
      const transaction = {
        portfolioId: formData.portfolioId,
        date: new Date(formData.date),
        action: formData.action as 'BUY' | 'SELL',
        ticker: formData.ticker,
        exchange: formData.exchange,
        country: exchangeOptions.find(e => e.value === formData.exchange)?.country || 'USA',
        quantity: formData.quantity,
        tradePrice: formData.tradePrice,
        currency: formData.currency,
        fees: formData.fees,
        notes: formData.notes || '',
        tag: formData.tag || ''
      };

      // Submit transaction via API
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        throw new Error('Failed to submit transaction');
      }

      const result = await response.json();
      console.log('Transaction submitted successfully:', result);
      
      // Redirect back to portfolio or dashboard
      if (formData.portfolioId) {
        router.push(`/portfolio/${formData.portfolioId}`);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
      alert('Failed to submit transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    const subtotal = formData.quantity * formData.tradePrice;
    const total = formData.action === 'BUY' ? subtotal + formData.fees : subtotal - formData.fees;
    return total;
  };

  const handleInputChange = (field: keyof TransactionFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Link 
              href={portfolioId ? `/portfolio/${portfolioId}` : '/'}
              className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Transaction
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Record a new buy or sell transaction for your portfolio
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Transaction Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Portfolio Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Portfolio *
                </label>
                <select
                  value={formData.portfolioId}
                  onChange={(e) => handleInputChange('portfolioId', e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.portfolioId ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select Portfolio</option>
                  {portfolioOptions.map(portfolio => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name} ({portfolio.currency})
                    </option>
                  ))}
                </select>
                {errors.portfolioId && (
                  <p className="mt-1 text-sm text-red-600">{errors.portfolioId}</p>
                )}
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.date ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                )}
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Action *
                </label>
                <select
                  value={formData.action}
                  onChange={(e) => handleInputChange('action', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </div>

              {/* Ticker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ticker Symbol *
                </label>
                <input
                  type="text"
                  placeholder="e.g., AAPL, MSFT"
                  value={formData.ticker}
                  onChange={(e) => handleInputChange('ticker', e.target.value.toUpperCase())}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.ticker ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.ticker && (
                  <p className="mt-1 text-sm text-red-600">{errors.ticker}</p>
                )}
              </div>

              {/* Exchange */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Exchange
                </label>
                <select
                  value={formData.exchange}
                  onChange={(e) => handleInputChange('exchange', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {exchangeOptions.map(exchange => (
                    <option key={exchange.value} value={exchange.value}>
                      {exchange.label} ({exchange.country})
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                
                {/* Currency Rate Display */}
                {formData.currency !== 'USD' && (
                  <div className="mt-2">
                    <CompactCurrencyRate 
                      fromCurrency={formData.currency}
                      toCurrency="USD"
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={formData.quantity || ''}
                  onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.quantity ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
                )}
              </div>

              {/* Trade Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price per Share *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.tradePrice || ''}
                  onChange={(e) => handleInputChange('tradePrice', parseFloat(e.target.value) || 0)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.tradePrice ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.tradePrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.tradePrice}</p>
                )}
              </div>

              {/* Fees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fees & Commissions
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.fees || ''}
                  onChange={(e) => handleInputChange('fees', parseFloat(e.target.value) || 0)}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.fees ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.fees && (
                  <p className="mt-1 text-sm text-red-600">{errors.fees}</p>
                )}
              </div>
            </div>

            {/* Calculation Summary */}
            {formData.quantity > 0 && formData.tradePrice > 0 && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calculator className="h-5 w-5 text-gray-400 mr-2" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Transaction Summary
                  </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {(formData.quantity * formData.tradePrice).toFixed(2)} {formData.currency}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Fees:</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formData.fees.toFixed(2)} {formData.currency}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Total:</span>
                    <div className="font-semibold text-lg text-gray-900 dark:text-white">
                      {calculateTotal().toFixed(2)} {formData.currency}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Cash Impact:</span>
                    <div className={`font-medium ${formData.action === 'BUY' ? 'text-red-600' : 'text-green-600'}`}>
                      {formData.action === 'BUY' ? '-' : '+'}{calculateTotal().toFixed(2)} {formData.currency}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Fields */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tag (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., SIP, Growth, Value"
                  value={formData.tag}
                  onChange={(e) => handleInputChange('tag', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <Link
              href={portfolioId ? `/portfolio/${portfolioId}` : '/'}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function AddTransactionPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <AddTransactionForm />
    </Suspense>
  );
}
