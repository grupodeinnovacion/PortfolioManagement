'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AllocationItem } from '@/types/portfolio';
import { getColorByIndex, formatCurrency, formatPercentage } from '@/lib/utils';

interface AllocationChartProps {
  allocations: AllocationItem[];
  type: 'portfolio' | 'sector' | 'country' | 'currency';
  currency?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AllocationItem }>;
  label?: string;
}

function CustomTooltip({ active, payload, currency = 'USD' }: CustomTooltipProps & { currency?: string }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">
          {data.name}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Value: {formatCurrency(data.value, currency)}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Allocation: {formatPercentage(data.percentage)}
        </p>
        {data.target && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Target: {formatPercentage(data.target)}
            </p>
            <p className={`text-sm ${data.drift && data.drift > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Drift: {data.drift ? formatPercentage(data.drift) : 'N/A'}
            </p>
          </>
        )}
      </div>
    );
  }
  return null;
}

function CustomLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  
  if (!cx || !cy || midAngle === undefined || !innerRadius || !outerRadius || !percent) {
    return null;
  }
  
  if (percent < 0.05) return null; // Don't show labels for slices less than 5%
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function AllocationChart({ allocations, type, currency = 'USD' }: AllocationChartProps) {
  const chartTitle = {
    portfolio: 'Portfolio Allocation',
    sector: 'Sector Allocation',
    country: 'Country Allocation',
    currency: 'Currency Allocation'
  }[type];

  // Prepare data with colors and grouping - memoized for performance
  const finalData = useMemo(() => {
    const chartData = allocations.map((item, index) => ({
      ...item,
      color: item.color || getColorByIndex(index)
    }));

    // Show only top 8 allocations, group rest as "Others"
    const topAllocations = chartData.slice(0, 8);
    const othersValue = chartData.slice(8).reduce((sum, item) => sum + item.value, 0);
    const othersPercentage = chartData.slice(8).reduce((sum, item) => sum + item.percentage, 0);

    const result = [...topAllocations];
    if (othersValue > 0) {
      result.push({
        name: 'Others',
        value: othersValue,
        percentage: othersPercentage,
        color: '#9CA3AF'
      });
    }
    return result;
  }, [allocations]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {chartTitle}
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {allocations.length} {type === 'portfolio' ? 'portfolios' : `${type}s`}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={finalData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="percentage"
            >
              {finalData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend 
              verticalAlign="bottom" 
              height={60}
              formatter={(value, entry) => (
                <span style={{ color: (entry as { payload?: { color?: string } })?.payload?.color }}>
                  {value} ({formatPercentage((entry as { payload?: { percentage?: number } })?.payload?.percentage || 0)})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Allocation Table for detailed view */}
      <div className="mt-4 overflow-hidden">
        <div className="max-h-48 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {type}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  %
                </th>
                {allocations.some(a => a.target) && (
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Drift
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {allocations.map((allocation, index) => (
                <tr key={allocation.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: allocation.color || getColorByIndex(index) }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {allocation.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(allocation.value, currency)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {formatPercentage(allocation.percentage)}
                  </td>
                  {allocations.some(a => a.target) && (
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                      {allocation.drift !== undefined ? (
                        <span className={allocation.drift > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatPercentage(allocation.drift)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AllocationChart);
