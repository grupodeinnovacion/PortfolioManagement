'use client';

import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
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
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  change, 
  changePercent, 
  icon, 
  trend = 'neutral' 
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {(change !== undefined || changePercent !== undefined) && (
            <div className={`mt-2 flex items-center text-sm ${getTrendColor(change || changePercent || 0)}`}>
              {getTrendIcon()}
              <span className="ml-1">
                {change !== undefined && formatCurrency(Math.abs(change), 'USD')}
                {change !== undefined && changePercent !== undefined && ' ('}
                {changePercent !== undefined && formatPercentage(Math.abs(changePercent))}
                {change !== undefined && changePercent !== undefined && ')'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <div className="text-blue-600 dark:text-blue-400">
              {icon}
            </div>
          </div>
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
        icon={<DollarSign className="h-5 w-5" />}
      />
      
      <MetricCard
        title="Unrealized P&L"
        value={formatCurrency(portfolio.unrealizedPL || 0, portfolio.currency)}
        subtitle={`${formatPercentage(portfolio.totalReturnPercent || 0)}`}
        trend={unrealizedTrend}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      
      <MetricCard
        title="Daily Change"
        value={formatCurrency(portfolio.dailyChange || 0, portfolio.currency)}
        subtitle={`${formatPercentage(portfolio.dailyChangePercent || 0)}`}
        trend={dailyTrend}
        icon={dailyTrend === 'up' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
      />
      
      <MetricCard
        title="Time-Weighted Return"
        value={formatPercentage(portfolio.xirr || 0)}
        subtitle="Annualized (XIRR)"
        trend={(portfolio.xirr || 0) >= 0 ? 'up' : 'down'}
        icon={<Calendar className="h-5 w-5" />}
      />
    </div>
  );
}
