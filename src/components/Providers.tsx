'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes (was cacheTime)
        retry: 1, // Only retry once on failure
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}