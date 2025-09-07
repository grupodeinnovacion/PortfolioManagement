import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  // Return N/A for zero, null, undefined, or invalid amounts (when real-time data is unavailable)
  if (amount === null || amount === undefined || amount === 0 || isNaN(amount)) {
    return 'N/A';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPrice(price: number | null | undefined, currency: string = 'USD'): string {
  // Special handling for stock prices - show N/A when real-time data is unavailable
  if (price === null || price === undefined || price === 0 || isNaN(price)) {
    return 'N/A';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatChange(change: number | null | undefined, changePercent: number | null | undefined): string {
  // Return N/A when real-time data is unavailable or values are null/undefined
  if (change === null || change === undefined || changePercent === null || changePercent === undefined || 
      isNaN(change) || isNaN(changePercent) || (change === 0 && changePercent === 0)) {
    return 'N/A';
  }
  
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
}

export function formatPercentage(value: number | null | undefined, decimals: number = 2): string {
  // Handle null, undefined, or invalid values
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  // Handle null, undefined, or invalid values
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatLargeNumber(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return (value / 1e9).toFixed(1) + 'B';
  }
  if (Math.abs(value) >= 1e6) {
    return (value / 1e6).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1e3) {
    return (value / 1e3).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

export function calculateAllocation(holdings: Array<{ currentValue: number }>, totalValue: number) {
  return holdings.map(holding => ({
    ...holding,
    allocation: calculatePercentage(holding.currentValue, totalValue)
  }));
}

export function getColorByIndex(index: number): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
    '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
  ];
  return colors[index % colors.length];
}

export function getTrendColor(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
}

export function getBgTrendColor(value: number): string {
  if (value > 0) return 'bg-green-100 dark:bg-green-900';
  if (value < 0) return 'bg-red-100 dark:bg-red-900';
  return 'bg-gray-100 dark:bg-gray-800';
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateXIRR(transactions: Array<{ action: string; quantity: number; tradePrice: number; date: Date | string }>): number {
  // Simplified XIRR calculation
  // In a real implementation, you'd use a proper XIRR library
  if (transactions.length < 2) return 0;
  
  const totalInvested = transactions
    .filter(t => t.action === 'BUY')
    .reduce((sum, t) => sum + (t.quantity * t.tradePrice), 0);
  
  const totalSold = transactions
    .filter(t => t.action === 'SELL')
    .reduce((sum, t) => sum + (t.quantity * t.tradePrice), 0);
  
  const days = Math.abs(
    new Date(transactions[transactions.length - 1].date).getTime() - 
    new Date(transactions[0].date).getTime()
  ) / (1000 * 60 * 60 * 24);
  
  if (totalInvested === 0 || days === 0) return 0;
  
  const years = days / 365.25;
  const simpleReturn = (totalSold - totalInvested) / totalInvested;
  
  return (Math.pow(1 + simpleReturn, 1 / years) - 1) * 100;
}

export function calculateDrift(current: number, target: number): number {
  if (target === 0) return 0;
  return current - target;
}

export function isValidTicker(ticker: string): boolean {
  return /^[A-Z]{1,10}(\.[A-Z]{1,5})?$/.test(ticker.toUpperCase());
}

export function normalizeTicker(ticker: string, exchange?: string): string {
  const normalized = ticker.toUpperCase().trim();
  
  // Add exchange suffix for Indian stocks if not present
  if (exchange?.toUpperCase().includes('NSE') && !normalized.includes('.')) {
    return `${normalized}.NS`;
  }
  if (exchange?.toUpperCase().includes('BSE') && !normalized.includes('.')) {
    return `${normalized}.BO`;
  }
  
  return normalized;
}

export function validateNumericInput(value: string): boolean {
  return !isNaN(Number(value)) && isFinite(Number(value));
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
