'use client';

import React from 'react';
import { PerformanceAnalytics } from '@/types/portfolio';
import { formatPercentage } from '@/lib/utils';
import { Shield, TrendingDown, Target, Info } from 'lucide-react';

interface RiskMetricsProps {
  analytics: PerformanceAnalytics;
}

interface RiskGaugeProps {
  value: number;
  label: string;
  description: string;
  maxValue: number;
  thresholds: { low: number; medium: number; high: number };
  colors: { low: string; medium: string; high: string };
}

function RiskGauge({ value, label, description, maxValue, thresholds, colors }: RiskGaugeProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  const getRiskLevel = () => {
    if (value <= thresholds.low) return { level: 'Low', color: colors.low };
    if (value <= thresholds.medium) return { level: 'Medium', color: colors.medium };
    return { level: 'High', color: colors.high };
  };

  const { level, color } = getRiskLevel();

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{label}</h4>
        <div className="group relative">
          <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
            {description}
          </div>
        </div>
      </div>

      {/* Gauge visual */}
      <div className="relative mb-3">
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          {formatPercentage(value, 1)}
        </span>
        <span
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: color + '20',
            color: color
          }}
        >
          {level} Risk
        </span>
      </div>
    </div>
  );
}

function RiskMetrics({ analytics }: RiskMetricsProps) {
  // Risk level assessments (simplified for beginners)
  const getVolatilityAssessment = (volatility: number) => {
    if (volatility <= 15) return "Your portfolio has been quite stable - low risk, but potentially lower returns.";
    if (volatility <= 25) return "Your portfolio shows moderate ups and downs - balanced risk and return potential.";
    return "Your portfolio is quite volatile - higher risk, but potentially higher returns.";
  };

  const getSharpeRatioAssessment = (sharpe: number) => {
    if (sharpe >= 1.5) return "Excellent! You're getting great returns for the risk you're taking.";
    if (sharpe >= 1.0) return "Good risk-adjusted returns. Your portfolio is performing well.";
    if (sharpe >= 0.5) return "Decent returns, but you might be taking more risk than necessary.";
    return "Consider reviewing your portfolio - you might not be getting enough return for the risk.";
  };

  const getDrawdownAssessment = (drawdown: number) => {
    if (drawdown <= 10) return "Great! Your portfolio hasn't had any major drops.";
    if (drawdown <= 20) return "Your portfolio experienced some moderate declines - this is normal.";
    return "Your portfolio had some significant drops. Make sure you're comfortable with this level of risk.";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Risk Analysis
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Understanding the risk in your portfolio helps you make better investment decisions.
          Here's how risky your investments have been:
        </p>

        {/* Risk Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RiskGauge
            value={analytics.volatility || 0}
            label="Volatility"
            description="How much your portfolio value bounces up and down"
            maxValue={50}
            thresholds={{ low: 15, medium: 25, high: 35 }}
            colors={{ low: '#10B981', medium: '#F59E0B', high: '#EF4444' }}
          />

          <RiskGauge
            value={analytics.maxDrawdown || 0}
            label="Max Drawdown"
            description="The biggest drop from your portfolio's peak value"
            maxValue={50}
            thresholds={{ low: 10, medium: 20, high: 30 }}
            colors={{ low: '#10B981', medium: '#F59E0B', high: '#EF4444' }}
          />

          <RiskGauge
            value={Math.max(0, analytics.sharpeRatio || 0)}
            label="Risk-Adjusted Return"
            description="How much return you get per unit of risk (higher is better)"
            maxValue={3}
            thresholds={{ low: 0.5, medium: 1.0, high: 1.5 }}
            colors={{ low: '#EF4444', medium: '#F59E0B', high: '#10B981' }}
          />
        </div>
      </div>

      {/* Risk Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Volatility Explanation */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-3">
            <TrendingDown className="w-4 h-4 text-orange-500 mr-2" />
            <h4 className="font-medium text-gray-900 dark:text-white">Your Portfolio's Volatility</h4>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getVolatilityAssessment(analytics.volatility || 0)}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
              <strong>What this means:</strong> Volatility measures how much your portfolio value jumps around.
              Low volatility = steady but potentially lower returns. High volatility = more ups and downs but potentially higher returns.
            </div>
          </div>
        </div>

        {/* Sharpe Ratio Explanation */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-3">
            <Target className="w-4 h-4 text-green-500 mr-2" />
            <h4 className="font-medium text-gray-900 dark:text-white">Risk-Adjusted Performance</h4>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getSharpeRatioAssessment(analytics.sharpeRatio || 0)}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
              <strong>What this means:</strong> This tells you if you're getting good returns for the risk you're taking.
              Above 1.0 is good, above 1.5 is excellent!
            </div>
          </div>
        </div>
      </div>

      {/* Max Drawdown Details */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Your Worst Losing Streak</h4>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getDrawdownAssessment(analytics.maxDrawdown || 0)}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
              <p className="text-xs text-gray-500 dark:text-gray-400">Maximum Drop</p>
              <p className="text-lg font-semibold text-red-600">{formatPercentage(analytics.maxDrawdown || 0)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Streak</p>
              <p className="text-lg font-semibold text-blue-600">
                {(analytics.currentWinningStreak || 0) > 0
                  ? `+${analytics.currentWinningStreak || 0} days`
                  : (analytics.currentLosingStreak || 0) > 0
                    ? `-${analytics.currentLosingStreak || 0} days`
                    : '0 days'
                }
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
              <p className="text-xs text-gray-500 dark:text-gray-400">Risk Level</p>
              <p className="text-lg font-semibold text-green-600">
                {(analytics.maxDrawdown || 0) <= 10 ? 'Low' : (analytics.maxDrawdown || 0) <= 20 ? 'Medium' : 'High'}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h5 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              💡 Remember
            </h5>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              All investments go up and down. The key is making sure you're comfortable with how much they might drop
              and that you're getting enough return to make the risk worthwhile. Consider your time horizon and risk tolerance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(RiskMetrics);