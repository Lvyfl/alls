'use client';

import { Wifi, WifiOff, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { mapTileCache } from '@/utils/map-tile-cache';

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
  className?: string;
}

export function NetworkStatusIndicator({ isOnline, className = '' }: NetworkStatusIndicatorProps) {
  const [cacheStats, setCacheStats] = useState<{ count: number; size: number } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateCacheStats = async () => {
      try {
        const stats = await mapTileCache.getCacheStats();
        setCacheStats(stats);
      } catch (error) {
        console.warn('Failed to get cache stats:', error);
      }
    };

    updateCacheStats();
    
    // Update stats every 30 seconds
    const interval = setInterval(updateCacheStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={`absolute top-4 right-4 z-[1000] ${className}`}>
      <div 
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg cursor-pointer transition-all duration-200 ${
          isOnline 
            ? 'bg-green-500 text-white hover:bg-green-600' 
            : 'bg-orange-500 text-white hover:bg-orange-600'
        }`}
        onClick={() => setShowDetails(!showDetails)}
        title={isOnline ? 'Online - Click for details' : 'Offline - Using cached tiles'}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[250px] z-[1001]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Network Status</span>
              <span className={`text-sm font-bold ${isOnline ? 'text-green-600' : 'text-orange-600'}`}>
                {isOnline ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex items-center space-x-2 mb-2">
                <Download className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Cached Tiles</span>
              </div>
              
              {cacheStats ? (
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Count:</span>
                    <span className="font-medium">{cacheStats.count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{formatBytes(cacheStats.size)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Loading cache info...</div>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="text-xs text-gray-500">
                {isOnline ? (
                  <>
                    <div>✓ Loading fresh tiles</div>
                    <div>✓ Caching for offline use</div>
                  </>
                ) : (
                  <>
                    <div>⚠ Using cached tiles only</div>
                    <div>⚠ Some areas may be unavailable</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
