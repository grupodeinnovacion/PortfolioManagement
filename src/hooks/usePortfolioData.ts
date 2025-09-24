import { useQuery } from '@tanstack/react-query';
import { portfolioService } from '@/services/portfolioService';
import { DashboardData, Portfolio } from '@/types/portfolio';
import {
  getMarketAwareStaleTime,
  getMarketAwareRefetchInterval,
  getMarketAwareCacheTime
} from '@/lib/marketHours';

// Hook for fetching dashboard data - with market-aware refresh
export function useDashboardData(currency: string) {
  return useQuery({
    queryKey: ['dashboard', currency],
    queryFn: () => portfolioService.getDashboardData(currency),
    staleTime: getMarketAwareStaleTime(), // Smart timing based on market hours
    gcTime: getMarketAwareCacheTime('dashboard'), // Longer cache when markets closed
    refetchInterval: getMarketAwareRefetchInterval(), // Auto-refetch only when markets open
    retry: 1, // Only retry once
    retryDelay: 1000, // 1 second retry delay
    refetchOnWindowFocus: true, // Refetch when window gains focus for fresh data
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  });
}

// Hook for fetching portfolios list - with market-aware caching
export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolioService.getPortfolios(),
    staleTime: getMarketAwareStaleTime(), // Smart timing based on market hours
    gcTime: getMarketAwareCacheTime('portfolios'), // Longer cache when markets closed
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
}

// Hook for fetching cash positions
export function useCashPositions() {
  return useQuery({
    queryKey: ['cash-positions'],
    queryFn: async () => {
      const response = await fetch('/api/cash-position');
      if (!response.ok) {
        throw new Error('Failed to fetch cash positions');
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
}

// Hook for fetching settings
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - settings change rarely
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for fetching individual portfolio data - with market-aware caching
export function usePortfolioData(portfolioId: string, currency: string) {
  return useQuery({
    queryKey: ['portfolio', portfolioId, currency],
    queryFn: () => portfolioService.getPortfolioData(portfolioId, currency),
    staleTime: getMarketAwareStaleTime(), // Smart timing based on market hours
    gcTime: getMarketAwareCacheTime('portfolios'), // Longer cache when markets closed
    refetchInterval: getMarketAwareRefetchInterval(), // Auto-refetch only when markets open
    enabled: !!portfolioId, // Only run if portfolioId is provided
  });
}

// Hook for fetching transactions
export function useTransactions(portfolioId?: string) {
  return useQuery({
    queryKey: ['transactions', portfolioId],
    queryFn: () => portfolioService.getTransactions(portfolioId),
    staleTime: 1 * 60 * 1000, // 1 minute - transactions change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}