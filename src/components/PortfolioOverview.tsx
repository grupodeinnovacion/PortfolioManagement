'use client';

import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Target } from 'lucide-react';
import { DashboardData } from '@/types/portfolio';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface PortfolioOverviewProps {
  data: DashboardData;
  currency: string;
  onCurrencyChange: (currency: string) => void;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  changePercent?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  change, 
  changePercent, 
  icon, 
  trend = 'neutral',
  onClick 
}: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {(change !== undefined || changePercent !== undefined) && (
            <div className={`mt-2 flex items-center text-sm ${getTrendColor()}`}>
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
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <div className="text-blue-600 dark:text-blue-400">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioOverview({ data, currency, onCurrencyChange }: PortfolioOverviewProps) {
  const totalPLTrend = data.totalPL >= 0 ? 'up' : 'down';
  const dailyTrend = data.dailyChange >= 0 ? 'up' : 'down';
  
  const currencies = ['USD', 'INR', 'EUR', 'GBP'];

  return (
    <div className="space-y-6">
      {/* Header with Currency Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Portfolio Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Currency:
          </label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="block w-24 pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white"
          >
            {currencies.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Invested"
          value={formatCurrency(data.totalInvested, currency)}
          subtitle="Initial Capital"
          icon={<DollarSign className="h-6 w-6" />}
        />
        
        <MetricCard
          title="Current Value"
          value={formatCurrency(data.totalCurrentValue, currency)}
          subtitle="Market Value"
          icon={<Target className="h-6 w-6" />}
        />
        
        <MetricCard
          title="Realized P&L"
          value={formatCurrency(data.totalRealizedPL, currency)}
          subtitle="From Completed Trades"
          trend={data.totalRealizedPL >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        
        <MetricCard
          title="Unrealized P&L"
          value={formatCurrency(data.totalUnrealizedPL, currency)}
          subtitle={`${formatPercentage(data.totalPLPercent)}`}
          trend={data.totalUnrealizedPL >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        
        <MetricCard
          title="Net P&L"
          value={formatCurrency(data.totalPL, currency)}
          subtitle={`${formatPercentage(data.totalPLPercent)}`}
          change={data.dailyChange}
          changePercent={data.dailyChangePercent}
          trend={totalPLTrend}
          icon={<TrendingUp className="h-6 w-6" />}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard
          title="Cash Position"
          value={formatCurrency(data.totalCashPosition, currency)}
          subtitle="Available for Investment"
          icon={<PiggyBank className="h-6 w-6" />}
        />
        
        <MetricCard
          title="Daily Change"
          value={formatCurrency(data.dailyChange, currency)}
          subtitle={`${formatPercentage(data.dailyChangePercent)}`}
          trend={dailyTrend}
          icon={dailyTrend === 'up' ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
        />
        
        <MetricCard
          title="XIRR (Annualized)"
          value={formatPercentage(data.xirr)}
          subtitle="Time-weighted Return"
          trend={data.xirr >= 0 ? 'up' : 'down'}
          icon={<Target className="h-6 w-6" />}
        />
      </div>
    </div>
  );
}
