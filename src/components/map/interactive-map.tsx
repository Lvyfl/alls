'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SafeMapContainer } from './safe-map-container';
import { Barangay } from '@/types';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ALL_BARANGAYS_ID } from '@/store/constants';
import { OfflineTileLayer } from './offline-tile-layer';
import { NetworkStatusIndicator } from './network-status-indicator';
import {
  initializeOfflineIcons,
  createOfflineBlueIcon,
  preloadOfflineIcons
} from '@/utils/offline-marker-icons';
import {
  generateUniqueContainerId,
  releaseContainerId,
  cleanupMapContainer,
  prepareMapContainer
} from '@/utils/map-container-manager';

// Initialize offline-compatible marker icons
initializeOfflineIcons();
preloadOfflineIcons();

interface MapCenterControllerProps {
  center: [number, number];
  zoom: number;
}

// Component to control map center when barangay changes
function MapCenterController({ center, zoom }: MapCenterControllerProps) {
  const map = useMap();

  useEffect(() => {
    // Add error handling and check if map is still valid
    try {
      if (map && map.getContainer) {
        const container = map.getContainer();
        // Verify container exists and is still in DOM
        if (container && container.parentNode && document.contains(container)) {
          map.setView(center, zoom);
        }
      }
    } catch (error) {
      // Silently handle the error during component unmounting
      console.warn('Map setView error (likely during unmount):', error);
    }
  }, [map, center, zoom]);

  return null;
}

interface InteractiveMapProps {
  barangays: Barangay[];
  selectedBarangay: string | null;
  enrollmentStats: Record<string, { total: number; active: number }>;
  className?: string;
}

export function InteractiveMap({
  barangays,
  selectedBarangay,
  enrollmentStats,
  className = ''
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isOnline = useOnlineStatus();
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Generate stable unique container ID to prevent reuse
  const containerId = useMemo(() => {
    return generateUniqueContainerId();
  }, []); // Empty dependency array ensures this is only generated once

  // Find the selected barangay or default to center of Indang, Cavite
  const selectedBarangayData = useMemo(() => {
    if (!selectedBarangay || selectedBarangay === ALL_BARANGAYS_ID) {
      return null;
    }
    return barangays.find(b => b._id === selectedBarangay) || null;
  }, [selectedBarangay, barangays]);

  const mapCenter: [number, number] = useMemo(() =>
    selectedBarangayData && selectedBarangayData.latitude && selectedBarangayData.longitude
      ? [selectedBarangayData.latitude, selectedBarangayData.longitude]
      : [14.1947, 120.8769], // Default center (Indang, Cavite)
    [selectedBarangayData]
  );

  const mapZoom = useMemo(() => selectedBarangayData ? 15 : 13, [selectedBarangayData]);

  // Create offline-compatible blue icon
  const blueIcon = useMemo(() => createOfflineBlueIcon(), []);

  // Cleanup tracking when component unmounts
  useEffect(() => {
    return () => {
      // Release container ID from tracking
      releaseContainerId(containerId);
    };
  }, [containerId]);

  // Preload tiles for current area when online
  useEffect(() => {
    if (isOnline && mapRef.current) {
      const preloadTilesForArea = async () => {
        const map = mapRef.current;
        if (!map) return;

        const bounds = map.getBounds();
        const zoom = map.getZoom();

        // Only preload for reasonable zoom levels to avoid excessive requests
        if (zoom >= 10 && zoom <= 16) {
          console.log(`🔄 Preloading tiles for zoom level ${zoom} (${isOnline ? 'Online' : 'Offline'})`);
          // The OfflineTileLayer will handle caching automatically when tiles are requested
        }
      };

      // Delay preloading to allow map to settle
      const timeoutId = setTimeout(preloadTilesForArea, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, mapCenter, mapZoom]);

  // Show error state if map failed to initialize
  if (mapError) {
    return (
      <div className={`relative ${className} flex items-center justify-center bg-gray-100 rounded-lg border-4 border-blue-600`}>
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-bold mb-2">Map Error</div>
          <p className="text-gray-600 text-sm mb-4">
            {mapError.includes('Map container is being reused')
              ? 'Map container conflict detected. Please refresh the page.'
              : 'Map failed to initialize properly.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Network Status Indicator */}
      <NetworkStatusIndicator isOnline={isOnline} />

      <SafeMapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full rounded-lg"
        ref={(mapInstance) => {
          if (mapInstance && !mapRef.current) {
            mapRef.current = mapInstance;
          }
        }}
        onMapReady={(mapInstance) => {
          console.log(`🗺️ Map ready with container ID: ${containerId} (${isOnline ? 'Online' : 'Offline'})`);
          setIsMapReady(true);
          setMapError(null);
        }}
        onMapError={(error) => {
          console.warn('SafeMapContainer error:', error);
          setMapError(error);
        }}
        // Map configuration props
        attributionControl={true}
        zoomControl={true}
        preferCanvas={false}
        doubleClickZoom={true}
        closePopupOnClick={true}
        scrollWheelZoom={true}
        touchZoom={true}
        dragging={true}
        boxZoom={true}
        keyboard={true}
      >
        {/* Offline-compatible tile layer */}
        <OfflineTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          isOnline={isOnline}
        />

        <MapCenterController center={mapCenter} zoom={mapZoom} />

        {barangays.map((barangay) => {
          if (!barangay.latitude || !barangay.longitude) return null;

          const stats = enrollmentStats[barangay._id] || { total: 0, active: 0 };

          return (
            <Marker
              key={barangay._id}
              position={[barangay.latitude, barangay.longitude]}
              icon={blueIcon}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-blue-600 text-lg mb-2">
                    {barangay.name.toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {barangay.address}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Current Enrollees:</span>
                      <span className="font-bold text-blue-600">{stats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Active Enrollees:</span>
                      <span className="font-bold text-green-600">{stats.active}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </SafeMapContainer>
    </div>
  );
}
