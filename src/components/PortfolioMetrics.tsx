'use client';

import { Portfolio } from '@/types/portfolio';
import { formatCurrency, formatPercentage, getTrendColor } from '@/lib/utils';

interface PortfolioMetricsProps {
  portfolio: Portfolio;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'neutral';
  currency?: string;
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  change, 
  changePercent, 
  trend,
  currency = 'USD'
}: MetricCardProps) {
  // Determine if this is a P&L metric that should be colored
  const isPLMetric = title.includes('P&L') || title.includes('Change') || title.includes('Return');
  const getValueColor = () => {
    if (!isPLMetric) return 'text-gray-900 dark:text-white';
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-900 dark:text-white';
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </p>
          <p className={`mt-2 text-2xl font-bold ${getValueColor()}`}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {(change !== undefined || changePercent !== undefined) && (
            <div className={`mt-2 flex items-center text-sm ${getTrendColor(change || changePercent || 0)}`}>
              <span>
                {change !== undefined && formatCurrency(Math.abs(change), currency)}
                {change !== undefined && changePercent !== undefined && ' ('}
                {changePercent !== undefined && formatPercentage(Math.abs(changePercent))}
                {change !== undefined && changePercent !== undefined && ')'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioMetrics({ portfolio }: PortfolioMetricsProps) {
  const realizedTrend = (portfolio.realizedPL || 0) >= 0 ? 'up' : 'down';
  const unrealizedTrend = (portfolio.unrealizedPL || 0) >= 0 ? 'up' : 'down';
  const dailyTrend = (portfolio.dailyChange || 0) >= 0 ? 'up' : 'down';

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Realized P&L"
        value={formatCurrency(portfolio.realizedPL || 0, portfolio.currency)}
        subtitle="From completed trades"
        trend={realizedTrend}
      />
      
      <MetricCard
        title="Unrealized P&L"
        value={formatCurrency(portfolio.unrealizedPL || 0, portfolio.currency)}
        subtitle={`${formatPercentage(portfolio.totalReturnPercent || 0)}`}
        trend={unrealizedTrend}
      />
      
      <MetricCard
        title="Daily Change"
        value={formatCurrency(portfolio.dailyChange || 0, portfolio.currency)}
        subtitle={`${formatPercentage(portfolio.dailyChangePercent || 0)}`}
        trend={dailyTrend}
      />
      
      <MetricCard
        title="Time-Weighted Return"
        value={formatPercentage(portfolio.xirr || 0)}
        subtitle="Annualized (XIRR)"
        trend={(portfolio.xirr || 0) >= 0 ? 'up' : 'down'}
      />
    </div>
  );
}
