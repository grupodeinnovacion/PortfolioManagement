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
import { portfolioService } from '@/services/portfolioService';
import { Portfolio, Holding } from '@/types/portfolio';

export default function PortfolioPage() {
  const params = useParams();
  const portfolioId = params.portfolioId as string;
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [realCashPosition, setRealCashPosition] = useState<number>(0);
  const [realizedPL, setRealizedPL] = useState<number>(0);
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

          // Fetch realized P&L for this portfolio
          try {
            const response = await fetch(`/api/realized-pl?portfolioId=${portfolioId}`);
            if (response.ok) {
              const { realizedPL: portfolioRealizedPL } = await response.json();
              setRealizedPL(portfolioRealizedPL);
            }
          } catch (error) {
            console.error('Error fetching realized P&L:', error);
            setRealizedPL(0);
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
      console.log('Refreshing holdings and portfolio data...');
      
      // Refresh holdings first
      const response = await fetch(`/api/holdings?portfolioId=${portfolioId}`, {
        cache: 'no-store', // Ensure we get fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const holdingsData = await response.json();
        setHoldings(holdingsData);
        console.log('Holdings updated:', holdingsData.length, 'holdings');
      }
      
      // Refresh cash position
      const cashResponse = await fetch('/api/cash-position', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (cashResponse.ok) {
        const cashPositions = await cashResponse.json();
        const newCashPosition = cashPositions[portfolioId] || 0;
        setRealCashPosition(newCashPosition);
        console.log('Cash position updated:', newCashPosition);
      }

      // Refresh realized P&L
      try {
        const realizedPLResponse = await fetch(`/api/realized-pl?portfolioId=${portfolioId}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (realizedPLResponse.ok) {
          const { realizedPL: portfolioRealizedPL } = await realizedPLResponse.json();
          setRealizedPL(portfolioRealizedPL);
          console.log('Realized P&L updated:', portfolioRealizedPL);
        }
      } catch (error) {
        console.error('Error refreshing realized P&L:', error);
      }
      
      // Refresh portfolio data (totals, etc.)
      const portfolios = await portfolioService.getPortfolios();
      const updatedPortfolio = portfolios.find(p => p.id === portfolioId);
      if (updatedPortfolio) {
        setPortfolio(updatedPortfolio);
        console.log('Portfolio data updated:', updatedPortfolio.totalInvested, updatedPortfolio.currentValue);
      }
      
      console.log('All data refreshed successfully');
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

  // Calculate sector allocations from actual holdings
  const calculateSectorAllocations = () => {
    if (!holdings || holdings.length === 0) {
      return [];
    }

    const sectorMap = new Map<string, number>();
    let totalHoldingsValue = 0;

    holdings.forEach(holding => {
      const sector = holding.sector || 'Other';
      const current = sectorMap.get(sector) || 0;
      sectorMap.set(sector, current + holding.currentValue);
      totalHoldingsValue += holding.currentValue;
    });

    // Include cash position in total portfolio value for proper allocation percentages
    const totalPortfolioValue = totalHoldingsValue + realCashPosition;

    // Add cash as a separate "sector" if there's cash position
    if (realCashPosition > 0) {
      sectorMap.set('Cash', realCashPosition);
    }

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#9CA3AF', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16'];

    return Array.from(sectorMap.entries()).map(([name, value], index) => ({
      name,
      value,
      percentage: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
      color: colors[index % colors.length]
    }));
  };

  // Calculate daily change from holdings data
  const calculateDailyChange = () => {
    if (!holdings || holdings.length === 0) {
      return { dailyChange: 0, dailyChangePercent: 0 };
    }

    const totalDailyChange = holdings.reduce((sum, holding) => sum + (holding.dailyChange || 0), 0);
    const totalCurrentValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
    const previousDayValue = totalCurrentValue - totalDailyChange;
    const dailyChangePercent = previousDayValue > 0 ? (totalDailyChange / previousDayValue) * 100 : 0;

    return { dailyChange: totalDailyChange, dailyChangePercent };
  };

  const { dailyChange, dailyChangePercent } = calculateDailyChange();
  
  // Enhanced portfolio object with calculated daily change and realized P&L
  const enhancedPortfolio = portfolio ? {
    ...portfolio,
    dailyChange,
    dailyChangePercent,
    realizedPL
  } : null;

  const sectorAllocations = calculateSectorAllocations();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading portfolio data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!enhancedPortfolio) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-64">
          <div className="text-gray-500 dark:text-gray-400">Portfolio not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Portfolio Header */}
        <PortfolioHeader 
          portfolio={enhancedPortfolio}
          realCashPosition={realCashPosition}
          onCashPositionUpdate={handleCashPositionUpdate}
          onTransactionSuccess={refreshHoldings}
        />

        {/* Tabs - Moved to top for better UX */}
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
          <div className="space-y-6">
            {/* Portfolio Metrics */}
            <PortfolioMetrics portfolio={enhancedPortfolio} />

            {/* Cash Position Bar */}
            <CashPositionBar 
              cashPosition={realCashPosition}
              investedAmount={enhancedPortfolio.totalInvested || 0}
              currency={enhancedPortfolio.currency}
            />

            {/* Overview Content - Charts and Summary */}
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
