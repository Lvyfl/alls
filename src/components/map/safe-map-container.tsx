'use client';

import { useEffect, useRef, useState, forwardRef } from 'react';
import { MapContainer, MapContainerProps } from 'react-leaflet';
import L from 'leaflet';

interface SafeMapContainerProps extends MapContainerProps {
  onMapReady?: (map: L.Map) => void;
  onMapError?: (error: string) => void;
}

/**
 * SafeMapContainer - A wrapper around React Leaflet's MapContainer
 * that handles container reuse errors and provides better lifecycle management
 */
export const SafeMapContainer = forwardRef<L.Map, SafeMapContainerProps>(
  ({ onMapReady, onMapError, children, ...mapProps }, ref) => {
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isUnmounting = useRef(false);

    // Generate a unique key for this map instance
    const mapKey = useRef(`safe-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

    useEffect(() => {
      // Component is mounting
      isUnmounting.current = false;
      setHasError(false);

      // Global error handler for Leaflet errors during unmount
      const handleGlobalError = (event: ErrorEvent) => {
        if (event.error?.message?.includes('Map container is being reused')) {
          // Always suppress this specific error as it's a known React Leaflet issue
          event.preventDefault();
          event.stopPropagation();
          console.warn('Suppressed map container reuse error (React Leaflet cleanup conflict)');
          return false;
        }
      };

      // Also handle unhandled promise rejections that might contain this error
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        if (event.reason?.message?.includes('Map container is being reused')) {
          event.preventDefault();
          console.warn('Suppressed map container reuse promise rejection');
        }
      };

      window.addEventListener('error', handleGlobalError, true);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        // Mark as unmounting to suppress errors
        isUnmounting.current = true;
        
        // Clean up error handlers
        window.removeEventListener('error', handleGlobalError, true);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        
        // Let React Leaflet handle its own cleanup
        // Don't interfere with the map instance
        setTimeout(() => {
          mapRef.current = null;
          containerRef.current = null;
        }, 200);
      };
    }, []);

    const handleMapRef = (mapInstance: L.Map | null) => {
      if (mapInstance && !mapRef.current && !isUnmounting.current) {
        mapRef.current = mapInstance;
        
        // Forward ref if provided
        if (typeof ref === 'function') {
          ref(mapInstance);
        } else if (ref) {
          ref.current = mapInstance;
        }

        // Call onMapReady callback
        if (onMapReady) {
          onMapReady(mapInstance);
        }
      }
    };

    const handleWhenReady = () => {
      if (!isUnmounting.current) {
        setIsReady(true);
        console.log(`🗺️ SafeMapContainer ready: ${mapKey.current}`);
      }
    };

    const handleError = (error: any) => {
      if (!isUnmounting.current) {
        const errorMessage = error?.message || 'Map container error';
        console.warn('SafeMapContainer error:', errorMessage);
        setHasError(true);
        if (onMapError) {
          onMapError(errorMessage);
        }
      }
    };

    // If there's an error, don't render the map
    if (hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center p-4">
            <div className="text-red-600 font-bold mb-2">Map Error</div>
            <p className="text-sm text-gray-600">Failed to initialize map container</p>
          </div>
        </div>
      );
    }

    return (
      <div ref={containerRef} className="h-full w-full">
        <MapContainer
          key={mapKey.current}
          ref={handleMapRef}
          whenReady={handleWhenReady}
          {...mapProps}
        >
          {children}
        </MapContainer>
      </div>
    );
  }
);

SafeMapContainer.displayName = 'SafeMapContainer';
