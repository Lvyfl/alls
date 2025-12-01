'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStoreState, useAuthStoreActions } from '@/store/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const { isAuthenticated } = useAuthStoreState();
  const { initialize } = useAuthStoreActions();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsInitialized(true);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Auth initialization timeout, proceeding...');
      setIsInitialized(true);
    }, 3000);

    initAuth().finally(() => {
      clearTimeout(timeout);
    });
  }, [initialize]);

  // Handle authentication check and redirect logic
  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        // Clear any stale cookies that might be causing middleware confusion
        if (typeof document !== 'undefined') {
          document.cookie = 'als_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'als_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'als_assigned_barangay=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }

        setShouldRedirect(true);
      } else {
        setShouldRedirect(false);
      }
    }
  }, [isInitialized, isAuthenticated]);

  // Handle the actual redirect in a separate effect
  useEffect(() => {
    if (shouldRedirect) {
      const redirectTimer = setTimeout(() => {
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
      }, 100); // Small delay to ensure clean state transition

      return () => clearTimeout(redirectTimer);
    }
  }, [shouldRedirect, router, pathname]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show redirect message while redirecting
  if (shouldRedirect || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render children
  return <>{children}</>;
}
