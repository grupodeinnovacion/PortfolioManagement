import { useQuery } from '@tanstack/react-query';
import { portfolioService } from '@/services/portfolioService';
import { DashboardData, Portfolio } from '@/types/portfolio';

// Hook for fetching dashboard data
export function useDashboardData(currency: string) {
  return useQuery({
    queryKey: ['dashboard', currency],
    queryFn: () => portfolioService.getDashboardData(currency),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for fetching portfolios list
export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolioService.getPortfolios(),
    staleTime: 5 * 60 * 1000, // 5 minutes - portfolios don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
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

// Hook for fetching individual portfolio data
export function usePortfolioData(portfolioId: string, currency: string) {
  return useQuery({
    queryKey: ['portfolio', portfolioId, currency],
    queryFn: () => portfolioService.getPortfolioData(portfolioId, currency),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
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