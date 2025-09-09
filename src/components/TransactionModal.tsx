'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Calculator } from 'lucide-react';
import { CompactCurrencyRate } from './CurrencyRateDisplay';
import { TransactionFormData } from '@/types/portfolio';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultAction?: 'BUY' | 'SELL';
  portfolioId?: string;
}

export default function TransactionModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  defaultAction = 'BUY',
  portfolioId = ''
}: TransactionModalProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    portfolioId: portfolioId,
    date: new Date().toISOString().slice(0, 16),
    action: defaultAction,
    ticker: '',
    quantity: 0,
    tradePrice: 0,
    currency: 'USD',
    fees: 0,
    notes: '',
    tag: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [stockExchange, setStockExchange] = useState<string>('');

  // Memoize portfolioOptions to prevent infinite re-renders
  const portfolioOptions = useMemo(() => [
    { id: 'usa-alpha', name: 'USA Alpha Fund', currency: 'USD', country: 'USA', exchange: 'NASDAQ' },
    { id: 'usa-sip', name: 'USA SIP', currency: 'USD', country: 'USA', exchange: 'NASDAQ' },
    { id: 'india-investments', name: 'India Investments', currency: 'INR', country: 'India', exchange: 'NSE' }
  ], []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const selectedPortfolio = portfolioOptions.find(p => p.id === portfolioId);
      const defaultCurrency = selectedPortfolio?.currency || 'USD';
      
      setFormData({
        portfolioId: portfolioId,
        date: new Date().toISOString().slice(0, 16),
        action: defaultAction,
        ticker: '',
        quantity: 0,
        tradePrice: 0,
        currency: defaultCurrency,
        fees: 0,
        notes: '',
        tag: ''
      });
      setErrors({});
      setCurrentPrice(null);
      setStockExchange('');
    }
  }, [isOpen, defaultAction, portfolioId, portfolioOptions]);

  // Fetch current stock price when ticker changes
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      if (formData.ticker && formData.ticker.length >= 2) {
        setLoadingPrice(true);
        try {
          // Get the selected portfolio to determine exchange context
          const selectedPortfolio = portfolioOptions.find(p => p.id === formData.portfolioId);
          
          // Build API URL with portfolio context for exchange-specific fetching
          let apiUrl = `/api/market-data?symbol=${formData.ticker}`;
          if (selectedPortfolio) {
            apiUrl += `&portfolioId=${selectedPortfolio.id}`;
            apiUrl += `&country=${selectedPortfolio.country}`;
            apiUrl += `&currency=${selectedPortfolio.currency}`;
          }
          
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            
            // Check both possible response structures
            const price = data.data?.price || data.price;
            const exchange = data.data?.exchange || '';
            
            if (price && price > 0) {
              setCurrentPrice(price);
              // Set the exchange information from the market data response
              setStockExchange(exchange);
              // Always update the price field with the current market price
              setFormData(prev => ({ ...prev, tradePrice: price }));
            } else {
              setCurrentPrice(null);
            }
          } else {
            setCurrentPrice(null);
          }
        } catch (error) {
          console.error('Error fetching current price:', error);
          setCurrentPrice(null);
        } finally {
          setLoadingPrice(false);
        }
      } else {
        // Clear price when ticker is too short
        setCurrentPrice(null);
        setLoadingPrice(false);
      }
    };

    const debounceTimer = setTimeout(fetchCurrentPrice, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.ticker, formData.portfolioId, portfolioOptions]);

  const handleInputChange = (field: keyof TransactionFormData, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-update currency when portfolio changes
      if (field === 'portfolioId') {
        const selectedPortfolio = portfolioOptions.find(p => p.id === value);
        if (selectedPortfolio) {
          newData.currency = selectedPortfolio.currency;
        }
      }
      
      return newData;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateTotal = (): number => {
    const subtotal = formData.quantity * formData.tradePrice;
    return formData.action === 'BUY' ? subtotal + formData.fees : subtotal - formData.fees;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.portfolioId) {
      newErrors.portfolioId = 'Portfolio is required';
    }
    if (!formData.ticker) {
      newErrors.ticker = 'Ticker symbol is required';
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

    // Get portfolio info to add exchange and country
    const selectedPortfolio = portfolioOptions.find(p => p.id === formData.portfolioId);
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date).toISOString(),
          exchange: stockExchange || selectedPortfolio?.exchange || 'NASDAQ',
          country: selectedPortfolio?.country || 'USA',
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to save transaction' });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to save transaction' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          
          {/* Modal content */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    {defaultAction === 'BUY' ? 'Buy Shares' : 'Sell Shares'}
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    {/* Ticker Symbol */}
                    <div className="relative">
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
                      {loadingPrice && (
                        <p className="mt-1 text-sm text-blue-600">Loading current price...</p>
                      )}
                      {currentPrice && (
                        <p className="mt-1 text-sm text-green-600">
                          Current price: {currentPrice.toFixed(2)} {formData.currency}
                        </p>
                      )}
                    </div>

                    {/* Currency Display */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Currency & Exchange
                      </label>
                      <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        {formData.currency}
                        {(() => {
                          // Show the actual stock exchange if we have it, otherwise show portfolio default
                          const displayExchange = stockExchange || (() => {
                            const selectedPortfolio = portfolioOptions.find(p => p.id === formData.portfolioId);
                            return selectedPortfolio?.exchange || (formData.currency === 'INR' ? 'NSE' : 'NASDAQ');
                          })();
                          
                          return (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({displayExchange})
                            </span>
                          );
                        })()}
                      </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                  {/* Optional Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  {/* Calculation Summary */}
                  {formData.quantity > 0 && formData.tradePrice > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
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

                  {errors.submit && (
                    <div className="text-red-600 text-sm">{errors.submit}</div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Saving...' : 'Save Transaction'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
