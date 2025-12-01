'use client';

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  // Simplified store provider - just render children
  // Data loading will be handled by individual components as needed
  return <>{children}</>;
}
