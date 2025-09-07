'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import PortfolioHeader from '@/components/PortfolioHeader';
import PortfolioMetrics from '@/components/PortfolioMetrics';
import CashPositionBar from '@/components/CashPositionBar';
import AllocationChart from '@/components/AllocationChart';
import HoldingsTable from '@/components/HoldingsTable';
import TransactionsList from '@/components/TransactionsList';
import { CurrencyRateDisplay, CompactCurrencyRate } from '@/components/CurrencyRateDisplay';
import { portfolioService } from '@/services/portfolioService';
import { Portfolio, Holding, Transaction } from '@/types/portfolio';

export default function PortfolioPage() {
  const params = useParams();
  const portfolioId = params.portfolioId as string;
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [realCashPosition, setRealCashPosition] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadPortfolioData = async () => {
      try {
        setLoading(true);
        
        // Get portfolio basic info
        const portfolios = await portfolioService.getPortfolios();
        const portfolioData = portfolios.find(p => p.id === portfolioId);
        
        if (portfolioData) {
          setPortfolio(portfolioData);
          
          // Fetch real cash position from API
          try {
            const response = await fetch('/api/cash-position');
            if (response.ok) {
              const cashPositions = await response.json();
              setRealCashPosition(cashPositions[portfolioId] || 0);
            }
          } catch (error) {
            console.error('Error fetching cash position:', error);
            setRealCashPosition(portfolioData.cashPosition || 0);
          }

          // Fetch holdings
          try {
            const response = await fetch(`/api/holdings?portfolioId=${portfolioId}`);
            if (response.ok) {
              const holdingsData = await response.json();
              setHoldings(holdingsData);
            }
          } catch (error) {
            console.error('Error fetching holdings:', error);
            setHoldings([]);
          }

          // Fetch transactions
          try {
            const transactionsData = await portfolioService.getTransactions(portfolioId);
            setTransactions(transactionsData);
          } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
          }
        }
      } catch (error) {
        console.error('Error loading portfolio data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (portfolioId) {
      loadPortfolioData();
    }
  }, [portfolioId]);

  const handleCashPositionUpdate = async (newAmount: number) => {
    if (!portfolio) return;
    
    try {
      await portfolioService.updateCashPosition(portfolio.id, newAmount);
      setRealCashPosition(newAmount);
      
      // Refresh all data to ensure consistency
      await refreshHoldings();
    } catch (error) {
      console.error('Error updating cash position:', error);
    }
  };

  const refreshHoldings = async () => {
    try {
      const response = await fetch(`/api/holdings?portfolioId=${portfolioId}`);
      if (response.ok) {
        const holdingsData = await response.json();
        setHoldings(holdingsData);
      }
      
      // Refresh cash position
      const cashResponse = await fetch('/api/cash-position');
      if (cashResponse.ok) {
        const cashPositions = await cashResponse.json();
        setRealCashPosition(cashPositions[portfolioId] || 0);
      }
      
      // Also refresh transactions and portfolio data
      const transactionsData = await portfolioService.getTransactions(portfolioId);
      setTransactions(transactionsData);
      
      const portfolios = await portfolioService.getPortfolios();
      const updatedPortfolio = portfolios.find(p => p.id === portfolioId);
      if (updatedPortfolio) {
        setPortfolio(updatedPortfolio);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!portfolio) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400">
            Portfolio not found
          </h2>
        </div>
      </DashboardLayout>
    );
  }

  const sectorAllocations = [
    { name: 'Technology', value: 450000, percentage: 65.2, color: '#3B82F6' },
    { name: 'Healthcare', value: 75000, percentage: 10.9, color: '#10B981' },
    { name: 'Consumer', value: 65000, percentage: 9.4, color: '#F59E0B' },
    { name: 'Others', value: 100000, percentage: 14.5, color: '#9CA3AF' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Portfolio Header */}
        <PortfolioHeader 
          portfolio={portfolio}
          realCashPosition={realCashPosition}
          onCashPositionUpdate={handleCashPositionUpdate}
        />

        {/* Portfolio Metrics */}
        <PortfolioMetrics portfolio={portfolio} />

        {/* Currency Rate Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Portfolio Currency: {portfolio.currency}
            </h3>
            <div className="space-y-2">
              {portfolio.currency !== 'USD' && (
                <CurrencyRateDisplay 
                  fromCurrency={portfolio.currency}
                  toCurrency="USD"
                  showLabel={false}
                  className="mb-2"
                />
              )}
              {portfolio.currency !== 'INR' && portfolio.currency !== 'USD' && (
                <CurrencyRateDisplay 
                  fromCurrency={portfolio.currency}
                  toCurrency="INR"
                  showLabel={false}
                />
              )}
              {portfolio.currency === 'USD' && (
                <CurrencyRateDisplay 
                  fromCurrency="USD"
                  toCurrency="INR"
                  showLabel={false}
                />
              )}
            </div>
          </div>
        </div>

        {/* Cash Position Bar */}
        <CashPositionBar 
          cashPosition={realCashPosition}
          investedAmount={portfolio.totalInvested || 0}
          currency={portfolio.currency}
        />

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'holdings', name: 'Holdings' },
              { id: 'transactions', name: 'Transactions' },
              { id: 'reports', name: 'Reports' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AllocationChart 
              allocations={sectorAllocations}
              type="sector"
              currency={portfolio.currency}
            />
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Performance Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Return:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(portfolio.totalReturnPercent || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">XIRR:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(portfolio.xirr || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Risk Free Rate:</span>
                    <span className="font-medium text-gray-900 dark:text-white">4.5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          <HoldingsTable holdings={holdings} currency={portfolio.currency} />
        )}

        {activeTab === 'transactions' && (
          <TransactionsList 
            portfolioId={portfolio.id} 
            currency={portfolio.currency}
            onTransactionUpdate={refreshHoldings}
          />
        )}

        {activeTab === 'reports' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Reports & Analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Advanced portfolio analytics and reporting features coming soon.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
