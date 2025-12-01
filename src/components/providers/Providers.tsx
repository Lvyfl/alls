'use client';

import { StoreProvider } from './StoreProvider';
import { ErrorBoundary } from '@/components/error-boundary';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <StoreProvider>
        {children}
      </StoreProvider>
    </ErrorBoundary>
  );
}
