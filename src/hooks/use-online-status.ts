'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect online/offline status
 * Returns true when online, false when offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    // Initialize with navigator.onLine if available
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    // Update initial status in case it changed
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('🌐 Network: Online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📴 Network: Offline');
      setIsOnline(false);
    };

    // Listen for network status changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Additional check with a ping to verify actual connectivity
    const checkConnectivity = async () => {
      try {
        const response = await fetch('/api/ping', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        const actuallyOnline = response.ok;
        setIsOnline(actuallyOnline);
      } catch {
        // If ping fails, we're likely offline
        setIsOnline(false);
      }
    };

    // Initial connectivity check after a short delay
    const initialCheckTimeout = setTimeout(checkConnectivity, 1000);

    // Check connectivity every 30 seconds
    const connectivityInterval = setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(initialCheckTimeout);
      clearInterval(connectivityInterval);
    };
  }, []); // Remove isOnline dependency to prevent infinite loops

  return isOnline;
}
