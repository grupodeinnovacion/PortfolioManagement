'use client';

import React from 'react';
import { PerformanceAnalytics } from '@/types/portfolio';
import { formatCurrency, formatPercentage, getTrendColor } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Award,
  Calendar,
  DollarSign,
  Percent,
  Clock
} from 'lucide-react';

interface PerformanceSummaryProps {
  analytics: PerformanceAnalytics;
  currency?: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  description?: string;
  highlight?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend = 'neutral',
  description,
  highlight = false
}: MetricCardProps) {
  const trendColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400'
  };

  const borderColors = {
    positive: 'border-green-200 dark:border-green-800',
    negative: 'border-red-200 dark:border-red-800',
    neutral: 'border-gray-200 dark:border-gray-700'
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 p-4 rounded-lg border ${
        highlight ? 'ring-2 ring-blue-500 ring-opacity-50' : borderColors[trend]
      } shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="text-blue-500 mr-2">{icon}</div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h4>
        </div>
      </div>

      <div className="space-y-1">
        <p className={`text-2xl font-bold ${trendColors[trend]}`}>{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function PerformanceSummary({ analytics, currency = 'USD' }: PerformanceSummaryProps) {
  // Determine trends
  const getTrend = (value: number): 'positive' | 'negative' | 'neutral' => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  // Format time period returns for display
  const formatTimeReturns = () => {
    const periods = [
      { label: '1M', value: analytics.returns1Month },
      { label: '3M', value: analytics.returns3Month },
      { label: '6M', value: analytics.returns6Month },
      { label: '1Y', value: analytics.returns1Year }
    ];

    return periods.map(period => ({
      ...period,
      trend: getTrend(period.value)
    }));
  };

  const timeReturns = formatTimeReturns();

  // Get performance assessment
  const getPerformanceAssessment = () => {
    const annualized = analytics.annualizedReturn;
    if (annualized >= 15) return { level: 'Excellent', color: 'text-green-600', icon: <Award className="w-4 h-4" /> };
    if (annualized >= 10) return { level: 'Very Good', color: 'text-green-500', icon: <Star className="w-4 h-4" /> };
    if (annualized >= 5) return { level: 'Good', color: 'text-blue-500', icon: <TrendingUp className="w-4 h-4" /> };
    if (annualized >= 0) return { level: 'Fair', color: 'text-yellow-500', icon: <TrendingUp className="w-4 h-4" /> };
    return { level: 'Needs Attention', color: 'text-red-500', icon: <TrendingDown className="w-4 h-4" /> };
  };

  const assessment = getPerformanceAssessment();

  return (
    <div className="space-y-6">
      {/* Overall Performance Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Performance Summary
          </h3>
          <div className={`flex items-center ${assessment.color}`}>
            {assessment.icon}
            <span className="ml-1 text-sm font-medium">{assessment.level}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Return</p>
            <p className={`text-3xl font-bold ${getTrendColor(analytics.totalReturnPercent)}`}>
              {formatPercentage(analytics.totalReturnPercent)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatCurrency(analytics.totalReturn, currency)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Annualized Return</p>
            <p className={`text-3xl font-bold ${getTrendColor(analytics.annualizedReturn)}`}>
              {formatPercentage(analytics.annualizedReturn)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Per year on average
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Risk Score</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {(analytics.sharpeRatio || 0).toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Return per unit of risk
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>What this means:</strong> {
              analytics.totalReturnPercent >= 0
                ? `Your portfolio has gained ${formatPercentage(Math.abs(analytics.totalReturnPercent))} over this period.`
                : `Your portfolio has lost ${formatPercentage(Math.abs(analytics.totalReturnPercent))} over this period.`
            } {
              analytics.annualizedReturn >= 0
                ? "If this performance continued, you'd average " + formatPercentage(analytics.annualizedReturn) + " per year."
                : "This represents challenges that may improve with time and portfolio adjustments."
            }
          </p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Best Single Day"
          value={formatPercentage(analytics.bestDay?.returnPercent || 0)}
          subtitle={analytics.bestDay?.date ? new Date(analytics.bestDay.date).toLocaleDateString() : 'N/A'}
          icon={<TrendingUp className="w-4 h-4" />}
          trend="positive"
          description="Your biggest daily gain"
        />

        <MetricCard
          title="Worst Single Day"
          value={formatPercentage(analytics.worstDay?.returnPercent || 0)}
          subtitle={analytics.worstDay?.date ? new Date(analytics.worstDay.date).toLocaleDateString() : 'N/A'}
          icon={<TrendingDown className="w-4 h-4" />}
          trend="negative"
          description="Your biggest daily loss"
        />

        <MetricCard
          title="Best Month"
          value={formatPercentage(analytics.bestMonth?.returnPercent || 0)}
          subtitle={analytics.bestMonth?.date || 'N/A'}
          icon={<Award className="w-4 h-4" />}
          trend="positive"
          description="Your best monthly performance"
        />

        <MetricCard
          title="Worst Month"
          value={formatPercentage(analytics.worstMonth?.returnPercent || 0)}
          subtitle={analytics.worstMonth?.date || 'N/A'}
          icon={<TrendingDown className="w-4 h-4" />}
          trend="negative"
          description="Your worst monthly performance"
        />
      </div>

      {/* Time Period Returns */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 text-blue-500 mr-2" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Returns by Time Period
          </h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {timeReturns.map((period) => (
            <div key={period.label} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{period.label}</p>
              <p className={`text-xl font-bold ${getTrendColor(period.value)}`}>
                {formatPercentage(period.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Tip:</strong> Compare these returns to market benchmarks like the S&P 500 (US) or NIFTY 50 (India)
            to see how you're doing relative to the overall market.
          </p>
        </div>
      </div>

      {/* Current Streak */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Calendar className="w-5 h-5 text-blue-500 mr-2" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Current Streak
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Winning Days</p>
            <p className="text-3xl font-bold text-green-600">
              {analytics.currentWinningStreak || 0}
            </p>
            <p className="text-sm text-green-600 mt-1">
              {(analytics.currentWinningStreak || 0) === 0
                ? "No current winning streak"
                : (analytics.currentWinningStreak || 0) === 1
                  ? "day in a row"
                  : "days in a row"
              }
            </p>
          </div>

          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Losing Days</p>
            <p className="text-3xl font-bold text-red-600">
              {analytics.currentLosingStreak || 0}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {(analytics.currentLosingStreak || 0) === 0
                ? "No current losing streak"
                : (analytics.currentLosingStreak || 0) === 1
                  ? "day in a row"
                  : "days in a row"
              }
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Remember:</strong> Short-term daily fluctuations are normal. Focus on long-term trends
            and don't let daily ups and downs affect your investment strategy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default React.memo(PerformanceSummary);