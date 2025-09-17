'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import PortfolioOverview from '@/components/PortfolioOverview';
import CashPositionBar from '@/components/CashPositionBar';
import AllocationChart from '@/components/AllocationChart';
import HoldingsTable from '@/components/HoldingsTable';
import CashPositionEditor from '@/components/CashPositionEditor';
import PerformanceSummary from '@/components/PerformanceSummary';
import PerformanceChart from '@/components/PerformanceChart';
import RiskMetrics from '@/components/RiskMetrics';
import { DashboardSkeleton } from '@/components/Skeleton';
import { portfolioService } from '@/services/portfolioService';
import { DashboardData, Portfolio } from '@/types/portfolio';
import { useDashboardData, usePortfolios, useCashPositions, useSettings, usePerformanceAnalytics } from '@/hooks/usePortfolioData';
import { BarChart3, RefreshCw } from 'lucide-react';

function DashboardContent() {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('1Y');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();

  // React Query hooks for data fetching
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardData(selectedCurrency);
  const { data: portfolios = [], isLoading: portfoliosLoading } = usePortfolios();
  const { data: cashPositionData = {}, isLoading: cashLoading } = useCashPositions();
  const { data: settings } = useSettings();

  // Performance analytics hook - only fetch when analytics tab is active
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = usePerformanceAnalytics(undefined, analyticsTimeframe, selectedCurrency);

  const loading = dashboardLoading || portfoliosLoading || cashLoading;

  // Load base currency from settings
  useEffect(() => {
    if (settings?.general?.baseCurrency) {
      setSelectedCurrency(settings.general.baseCurrency);
    }
  }, [settings]);

  // Convert cash positions to dashboard currency
  const convertedCashPositions = portfolios.reduce((acc: Record<string, number>, portfolio) => {
    const amount = cashPositionData[portfolio.id];
    if (typeof amount === 'number') {
      const rate = portfolioService.getExchangeRate(portfolio.currency, selectedCurrency);
      acc[portfolio.id] = amount * rate;
    }
    return acc;
  }, {});

  const handleDataUpdate = () => {
    // React Query will handle data invalidation and refetching
    // For now, we could add manual invalidation if needed
  };

  // Enhanced refresh function with loading state
  const handleRefreshAnalytics = async () => {
    setIsRefreshing(true);
    try {
      // Clear the analytics cache first to force fresh calculation
      queryClient.removeQueries({
        queryKey: ['performance-analytics', undefined, analyticsTimeframe, selectedCurrency]
      });

      // Also clear the server-side cache by calling the clear-cache endpoint
      await fetch('/api/performance?action=clear-cache');

      // Then refetch with fresh data
      await refetchAnalytics();
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setIsRefreshing(false);
    }
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

        {/* Performance Analytics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Performance Analytics
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              {/* Timeframe Selector */}
              <select
                value={analyticsTimeframe}
                onChange={(e) => setAnalyticsTimeframe(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="1M">1 Month</option>
                <option value="3M">3 Months</option>
                <option value="6M">6 Months</option>
                <option value="1Y">1 Year</option>
                <option value="3Y">3 Years</option>
                <option value="ALL">All Time</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={handleRefreshAnalytics}
                disabled={analyticsLoading || isRefreshing}
                className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${(analyticsLoading || isRefreshing) ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>

              {/* Toggle Analytics */}
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  showAnalytics
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </button>
            </div>
          </div>

          {/* Analytics Content */}
          {showAnalytics && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Calculating performance analytics...
                    </span>
                  </div>
                </div>
              ) : analyticsError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                    Unable to load analytics
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {analyticsError.message || 'There was an error calculating your performance metrics.'}
                  </p>
                  <button
                    onClick={() => refetchAnalytics()}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : analytics ? (
                <>
                  {/* Performance Summary */}
                  <PerformanceSummary analytics={analytics} currency={selectedCurrency} />

                  {/* Charts and Risk Metrics */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2">
                      <PerformanceChart analytics={analytics} currency={selectedCurrency} />
                    </div>
                    <div>
                      <RiskMetrics analytics={analytics} />
                    </div>
                  </div>

                  {/* Beginner Tips */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                      💡 Key Takeaways for Your Portfolio
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">✅ What's Going Well:</p>
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                          {analytics.totalReturnPercent > 0 && <li>• Portfolio is profitable overall</li>}
                          {analytics.sharpeRatio > 1 && <li>• Good risk-adjusted returns</li>}
                          {analytics.maxDrawdown < 20 && <li>• Losses have been manageable</li>}
                          {analytics.currentWinningStreak > 0 && <li>• Currently on a winning streak</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">🎯 Areas to Consider:</p>
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                          {analytics.volatility > 25 && <li>• Portfolio shows high volatility</li>}
                          {analytics.sharpeRatio < 0.5 && <li>• Consider reviewing risk vs return</li>}
                          {analytics.maxDrawdown > 30 && <li>• Large drawdowns suggest high risk</li>}
                          <li>• Compare returns to market benchmarks</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">
                    No analytics data available. Please ensure you have transaction history to analyze.
                  </p>
                </div>
              )}
            </div>
          )}
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
