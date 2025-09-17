'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { PerformanceAnalytics, ChartDataPoint, MonthlyReturn } from '@/types/portfolio';
import { formatCurrency, formatPercentage, getTrendColor } from '@/lib/utils';
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react';

interface PerformanceChartProps {
  analytics: PerformanceAnalytics;
  currency?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint; value: number; color: string }>;
  label?: string;
  currency?: string;
}

function ValueTooltip({ active, payload, label, currency = 'USD' }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">
          {new Date(label || '').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Portfolio Value: {formatCurrency(data.value, currency)}
        </p>
      </div>
    );
  }
  return null;
}

interface MonthlyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyReturn; value: number; color: string }>;
  label?: string;
}

function MonthlyTooltip({ active, payload, label }: MonthlyTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">
          {new Date(label + '-01').toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })}
        </p>
        <p className={`text-sm ${data.returnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Return: {formatPercentage(data.returnPercent)}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          From: {formatCurrency(data.startValue)}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          To: {formatCurrency(data.endValue)}
        </p>
      </div>
    );
  }
  return null;
}

function PerformanceChart({ analytics, currency = 'USD' }: PerformanceChartProps) {
  const [activeChart, setActiveChart] = useState<'value' | 'returns'>('value');

  // Prepare data for charts
  const valueChartData = (analytics.valueHistory || []).map(point => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const monthlyReturnsData = (analytics.monthlyReturns || []).map(monthData => ({
    ...monthData,
    month: new Date(monthData.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }));

  const ChartSelector = () => (
    <div className="flex space-x-2 mb-4">
      <button
        onClick={() => setActiveChart('value')}
        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeChart === 'value'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <TrendingUp className="w-4 h-4 mr-1" />
        Portfolio Value
      </button>
      <button
        onClick={() => setActiveChart('returns')}
        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeChart === 'returns'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <BarChart3 className="w-4 h-4 mr-1" />
        Monthly Returns
      </button>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Over Time
          </h3>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {analytics.timeframe} • Last updated: {analytics.calculatedAt ? new Date(analytics.calculatedAt).toLocaleTimeString() : 'N/A'}
        </div>
      </div>

      <ChartSelector />

      <div className="h-80">
        {activeChart === 'value' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={valueChartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, currency).replace(/\$|USD|INR|EUR|GBP/, '')}
              />
              <Tooltip content={<ValueTooltip currency={currency} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyReturnsData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<MonthlyTooltip />} />
              <Bar dataKey="returnPercent" fill="#8884d8">
                {monthlyReturnsData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.returnPercent >= 0 ? '#10B981' : '#EF4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Period Return</p>
          <p className={`text-lg font-semibold ${getTrendColor(analytics.totalReturnPercent || 0)}`}>
            {formatPercentage(analytics.totalReturnPercent || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Annualized</p>
          <p className={`text-lg font-semibold ${getTrendColor(analytics.annualizedReturn || 0)}`}>
            {formatPercentage(analytics.annualizedReturn || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Best Month</p>
          <p className="text-lg font-semibold text-green-600">
            {formatPercentage(analytics.bestMonth?.returnPercent || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Worst Month</p>
          <p className="text-lg font-semibold text-red-600">
            {formatPercentage(analytics.worstMonth?.returnPercent || 0)}
          </p>
        </div>
      </div>

      {/* Helpful explanations for beginners */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
          💡 Understanding Your Charts
        </h4>
        <p className="text-xs text-blue-700 dark:text-blue-400">
          {activeChart === 'value'
            ? "This line shows how your total portfolio value has changed over time. Going up is good!"
            : "These bars show your monthly returns. Green months = gains, red months = losses. It's normal to have both!"
          }
        </p>
      </div>
    </div>
  );
}

export default React.memo(PerformanceChart);