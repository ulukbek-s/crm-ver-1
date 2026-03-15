'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
  }));
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
