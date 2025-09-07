'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PortfolioOverview from '@/components/PortfolioOverview';
import CashPositionBar from '@/components/CashPositionBar';
import AllocationChart from '@/components/AllocationChart';
import HoldingsTable from '@/components/HoldingsTable';
import CashPositionEditor from '@/components/CashPositionEditor';
import { portfolioService } from '@/services/portfolioService';
import { DashboardData, Portfolio } from '@/types/portfolio';

function DashboardContent() {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, portfolioList] = await Promise.all([
        portfolioService.getDashboardData(selectedCurrency),
        portfolioService.getPortfolios()
      ]);
      setDashboardData(data);
      setPortfolios(portfolioList);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
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
                cashPosition={portfolio.cashPosition}
                currency={portfolio.currency}
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
          />
          <AllocationChart 
            allocations={dashboardData.sectorAllocations}
            type="sector"
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <DashboardContent />
    </Suspense>
  );
}
