'use client';

import { useState } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  TrendingUp, 
  TrendingDown,
  Search
} from 'lucide-react';
import { Holding } from '@/types/portfolio';
import { formatCurrency, formatPrice, formatChange, formatPercentage, getTrendColor } from '@/lib/utils';

interface HoldingsTableProps {
  holdings: Holding[];
  currency: string;
}

type SortField = keyof Holding;
type SortDirection = 'asc' | 'desc';

export default function HoldingsTable({ holdings, currency }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-blue-600" />
      : <ChevronDownIcon className="h-4 w-4 text-blue-600" />;
  };

  // Filter and sort holdings
  const filteredHoldings = holdings.filter(holding =>
    holding.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    holding.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {getSortIcon(field)}
      </div>
    </th>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Stock Holdings
          </h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {holdings.length} holdings
          </div>
        </div>
        
        {/* Search */}
        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search holdings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
          <colgroup><col className="w-20" /><col className="w-48" /><col className="w-16" /><col className="w-24" /><col className="w-24" /><col className="w-28" /><col className="w-24" /><col className="w-20" /><col className="w-24" /><col className="w-20" /></colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <SortableHeader field="ticker">Ticker</SortableHeader>
              <SortableHeader field="name">Name</SortableHeader>
              <SortableHeader field="quantity">Qty</SortableHeader>
              <SortableHeader field="avgBuyPrice">Avg Buy Price</SortableHeader>
              <SortableHeader field="currentPrice">Current Price</SortableHeader>
              <SortableHeader field="currentValue">Market Value</SortableHeader>
              <SortableHeader field="unrealizedPL">P&L</SortableHeader>
              <SortableHeader field="unrealizedPLPercent">P&L %</SortableHeader>
              <SortableHeader field="dailyChange">Daily Change</SortableHeader>
              <SortableHeader field="allocation">Allocation</SortableHeader>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedHoldings.map((holding) => (
              <tr key={holding.ticker} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="overflow-hidden">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {holding.ticker}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {holding.exchange} • {holding.country}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="overflow-hidden">
                    <div className="text-sm text-gray-900 dark:text-white truncate" title={holding.name}>
                      {holding.name}
                    </div>
                    {holding.sector && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={holding.sector}>
                        {holding.sector}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                  {holding.quantity.toFixed(2)}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                  {formatCurrency(holding.avgBuyPrice, holding.currency)}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                  {formatPrice(holding.currentPrice, holding.currency)}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                  {formatCurrency(holding.currentValue, holding.currency)}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className={`text-sm font-medium ${getTrendColor(holding.unrealizedPL)}`}>
                    {formatCurrency(holding.unrealizedPL, holding.currency)}
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className={`flex items-center justify-end text-sm font-medium ${getTrendColor(holding.unrealizedPLPercent)}`}>
                    {holding.unrealizedPLPercent >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {formatPercentage(holding.unrealizedPLPercent)}
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className={`flex items-center justify-end text-sm ${getTrendColor(holding.dailyChange)}`}>
                    {holding.dailyChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    <div>
                      <div>{formatCurrency(holding.dailyChange, holding.currency)}</div>
                      <div className="text-xs">
                        {formatPercentage(holding.dailyChangePercent)}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatPercentage(holding.allocation)}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(holding.allocation, 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {sortedHoldings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No holdings found matching your search.' : 'No holdings available.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
