'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PortfolioOverview from '@/components/PortfolioOverview';
import CashPositionBar from '@/components/CashPositionBar';
import CashPositionEditor from '@/components/CashPositionEditor';
import AllocationChart from '@/components/AllocationChart';
import HoldingsTable from '@/components/HoldingsTable';
import { DashboardSkeleton } from '@/components/Skeleton';
import { portfolioService } from '@/services/portfolioService';
import { DashboardData, Portfolio } from '@/types/portfolio';
import { useDashboardData, usePortfolios, useCashPositions, useSettings } from '@/hooks/usePortfolioData';


function DashboardContent() {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  // React Query hooks for data fetching
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardData(selectedCurrency);
  const { data: portfolios = [], isLoading: portfoliosLoading } = usePortfolios();
  const { data: cashPositionData = {}, isLoading: cashLoading } = useCashPositions();
  const { data: settings } = useSettings();

  const loading = dashboardLoading || portfoliosLoading || cashLoading;

  // Load base currency from settings
  useEffect(() => {
    if (settings?.general?.baseCurrency) {
      setSelectedCurrency(settings.general.baseCurrency);
    }
  }, [settings]);

  // Convert cash positions to dashboard currency - memoized for performance
  const convertedCashPositions = useMemo(() => {
    return portfolios.reduce((acc: Record<string, number>, portfolio) => {
      const amount = cashPositionData[portfolio.id];
      if (typeof amount === 'number') {
        const rate = portfolioService.getExchangeRate(portfolio.currency, selectedCurrency);
        acc[portfolio.id] = amount * rate;
      }
      return acc;
    }, {});
  }, [portfolios, cashPositionData, selectedCurrency]);

  const handleDataUpdate = () => {
    // React Query will handle data invalidation and refetching
    // For now, we could add manual invalidation if needed
  };

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
                cashPosition={convertedCashPositions[portfolio.id] || 0}
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
  return <DashboardContent />;
}
