'use client';

import { useState, useEffect } from 'react';
import { CacheManager, CacheInfo } from '@/utils/cache-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CacheDebug() {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const refreshCacheInfo = () => {
    setCacheInfo(CacheManager.getCacheInfo());
  };

  useEffect(() => {
    refreshCacheInfo();
  }, []);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      CacheManager.clearAllCache();
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      refreshCacheInfo();
      // Show success message
      alert('All cache cleared successfully! The page will refresh.');
      CacheManager.forceRefresh();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Check console for details.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearStore = async () => {
    setIsClearing(true);
    try {
      CacheManager.clearStoreCache();
      await new Promise(resolve => setTimeout(resolve, 500));
      refreshCacheInfo();
      alert('Store cache cleared successfully! The page will refresh.');
      CacheManager.forceRefresh();
    } catch (error) {
      console.error('Failed to clear store cache:', error);
      alert('Failed to clear store cache. Check console for details.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleValidateCache = () => {
    const validation = CacheManager.validateCache();
    if (validation.isValid) {
      alert('Cache is valid ✅');
    } else {
      alert(`Cache has issues ❌:\n${validation.issues.join('\n')}`);
    }
  };

  if (!cacheInfo) {
    return <div>Loading cache information...</div>;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cache Information</CardTitle>
          <CardDescription>
            Current browser cache status for ALS Student Tracker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Store Version</h4>
              <p className="text-sm text-gray-600">
                {cacheInfo.storeVersion || 'Not set'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Total Cache Size</h4>
              <p className="text-sm text-gray-600">
                {formatBytes(cacheInfo.totalCacheSize)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Auth Data</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>User: {cacheInfo.authData.user ? '✅ Present' : '❌ Missing'}</p>
              <p>Token: {cacheInfo.authData.token ? '✅ Present' : '❌ Missing'}</p>
              <p>Role: {cacheInfo.authData.role || 'Not set'}</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold">Store Data</h4>
            <p className="text-sm text-gray-600">
              {cacheInfo.storeData ? '✅ Present' : '❌ Missing'}
            </p>
            {cacheInfo.storeData && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-blue-600">
                  View store data structure
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(cacheInfo.storeData, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <div>
            <h4 className="font-semibold">Cache Keys ({cacheInfo.cacheKeys.length})</h4>
            <div className="text-sm text-gray-600 max-h-32 overflow-auto">
              {cacheInfo.cacheKeys.length > 0 ? (
                <ul className="list-disc list-inside">
                  {cacheInfo.cacheKeys.map((key, index) => (
                    <li key={index}>{key}</li>
                  ))}
                </ul>
              ) : (
                <p>No ALS cache keys found</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Tools to manage and troubleshoot cache issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={refreshCacheInfo}
              variant="outline"
              size="sm"
            >
              🔄 Refresh Info
            </Button>
            
            <Button 
              onClick={handleValidateCache}
              variant="outline"
              size="sm"
            >
              ✅ Validate Cache
            </Button>
            
            <Button 
              onClick={handleClearStore}
              variant="outline"
              size="sm"
              disabled={isClearing}
            >
              🧹 Clear Store Cache
            </Button>
            
            <Button 
              onClick={handleClearAll}
              variant="destructive"
              size="sm"
              disabled={isClearing}
            >
              🗑️ Clear All Cache
            </Button>
          </div>

          {isClearing && (
            <div className="text-sm text-blue-600">
              Clearing cache... Please wait.
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Clear Store Cache:</strong> Removes only Zustand store data, preserves authentication</p>
            <p><strong>Clear All Cache:</strong> Removes all ALS-related data including authentication</p>
            <p><strong>Note:</strong> The page will refresh after clearing cache</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
