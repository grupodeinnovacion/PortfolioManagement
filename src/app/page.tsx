'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PortfolioOverview from '@/components/PortfolioOverview';
import CashPositionBar from '@/components/CashPositionBar';
import AllocationChart from '@/components/AllocationChart';
import HoldingsTable from '@/components/HoldingsTable';
import CashPositionEditor from '@/components/CashPositionEditor';
import { DashboardSkeleton } from '@/components/Skeleton';
import { portfolioService } from '@/services/portfolioService';
import { DashboardData, Portfolio } from '@/types/portfolio';

function DashboardContent() {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [cashPositions, setCashPositions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Load base currency from settings on mount
  useEffect(() => {
    const loadBaseCurrency = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          const baseCurrency = settings.general?.baseCurrency || 'USD';
          setSelectedCurrency(baseCurrency);
        }
      } catch (error) {
        console.error('Error loading base currency from settings:', error);
      }
    };
    loadBaseCurrency();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use Promise.allSettled to continue even if some requests fail
      const [dataResult, portfolioListResult, cashPositionResult] = await Promise.allSettled([
        portfolioService.getDashboardData(selectedCurrency),
        portfolioService.getPortfolios(),
        fetch('/api/cash-position').then(res => res.ok ? res.json() : {})
      ]);
      
      // Extract successful results
      const data = dataResult.status === 'fulfilled' ? dataResult.value : null;
      const portfolioList = portfolioListResult.status === 'fulfilled' ? portfolioListResult.value : [];
      const cashPositionData = cashPositionResult.status === 'fulfilled' ? cashPositionResult.value : {};
      
      if (!data) {
        console.error('Failed to fetch dashboard data');
        return;
      }
      
      // Convert cash positions to dashboard currency
      const convertedCashPositions: Record<string, number> = {};
      for (const [portfolioId, amount] of Object.entries(cashPositionData)) {
        const portfolio = portfolioList.find(p => p.id === portfolioId);
        if (portfolio && typeof amount === 'number') {
          const rate = portfolioService.getExchangeRate(portfolio.currency, selectedCurrency);
          convertedCashPositions[portfolioId] = amount * rate;
        }
      }
      
      setDashboardData(data);
      setPortfolios(portfolioList);
      setCashPositions(convertedCashPositions);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency]);

  useEffect(() => {
    fetchData();
  }, [selectedCurrency, fetchData]);

  const handleDataUpdate = () => {
    fetchData();
  };

  // Add a page focus event to refresh data when returning from other pages
  // Only refresh if data is older than 2 minutes to avoid excessive API calls
  useEffect(() => {
    const handleFocus = () => {
      if (dashboardData) {
        const lastUpdated = new Date(dashboardData.lastUpdated);
        const now = new Date();
        const timeDiff = now.getTime() - lastUpdated.getTime();
        const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
        
        if (timeDiff > twoMinutes) {
          fetchData();
        }
      } else {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, dashboardData]);

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400">
            No data available. Please check your data connection.
          </h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Portfolio Overview */}
        <PortfolioOverview 
          data={dashboardData} 
          currency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
        />

        {/* Cash Position Editors */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Portfolio Cash Positions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map((portfolio) => (
              <CashPositionEditor
                key={portfolio.id}
                portfolioId={portfolio.id}
                portfolioName={portfolio.name}
                cashPosition={cashPositions[portfolio.id] || 0}
                currency={selectedCurrency}
                onUpdate={handleDataUpdate}
              />
            ))}
          </div>
        </div>

        {/* Cash Position vs Investment Bar */}
        <CashPositionBar 
          cashPosition={dashboardData.totalCashPosition}
          investedAmount={dashboardData.totalInvested}
          currency={selectedCurrency}
        />

        {/* Charts and Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllocationChart 
            allocations={dashboardData.allocations}
            type="portfolio"
            currency={selectedCurrency}
          />
          <AllocationChart 
            allocations={dashboardData.sectorAllocations}
            type="sector"
            currency={selectedCurrency}
          />
        </div>

        {/* Holdings Table */}
        <HoldingsTable 
          holdings={dashboardData.topHoldings}
          currency={selectedCurrency}
        />
      </div>
    </DashboardLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    }>
      <DashboardContent />
    </Suspense>
  );
}
