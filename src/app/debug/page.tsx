'use client';

import { useEffect, useState } from 'react';
import { logStorageTestResults, testStorageAvailability } from '@/utils/storage-debug';
import { authService } from '@/services/auth-service';
import { CacheDebug } from '@/components/debug/cache-debug';

export default function DebugPage() {
  const [storageResults, setStorageResults] = useState<any>(null);
  const [authState, setAuthState] = useState<any>(null);

  useEffect(() => {
    // Test storage availability
    const results = testStorageAvailability();
    setStorageResults(results);

    // Log to console
    logStorageTestResults();

    // Test auth service
    try {
      const user = authService.getCurrentUser();
      const token = authService.getToken();
      const isAuthenticated = authService.isAuthenticated();

      // Also check cookies
      const cookies = document.cookie;

      setAuthState({
        user,
        token,
        isAuthenticated,
        cookies,
        localStorage: {
          user: localStorage.getItem('als_user'),
          token: localStorage.getItem('als_token'),
          role: localStorage.getItem('als_user_role'),
        },
        sessionStorage: {
          user: sessionStorage.getItem('als_user'),
          token: sessionStorage.getItem('als_token'),
          role: sessionStorage.getItem('als_user_role'),
        }
      });
    } catch (error) {
      setAuthState({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  const handleTestLogin = async () => {
    try {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'testpassword',
        rememberMe: false,
      });

      console.log('Login result:', result);
      alert('Login successful! Check console for details.');

      // Refresh auth state
      window.location.reload();
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleClearAuth = async () => {
    try {
      await authService.logout();

      // Also manually clear any stale cookies
      document.cookie = 'als_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'als_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'als_assigned_barangay=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      alert('Authentication cleared!');
      window.location.reload();
    } catch (error) {
      console.error('Clear auth error:', error);
      alert('Clear auth failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Storage & Auth Debug Page</h1>

        {/* Storage Test Results */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Storage Availability Test</h2>
          {storageResults ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">localStorage:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(storageResults.localStorage, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-medium">sessionStorage:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(storageResults.sessionStorage, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-medium">cookies:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(storageResults.cookies, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p>Loading storage test results...</p>
          )}
        </div>

        {/* Auth State */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          {authState ? (
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(authState, null, 2)}
            </pre>
          ) : (
            <p>Loading auth state...</p>
          )}
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={handleTestLogin}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Test Login (test@example.com)
              </button>

              <button
                onClick={handleClearAuth}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Clear All Auth Data
              </button>
            </div>

            <div className="text-sm text-gray-600">
              <p><strong>Test Login:</strong> Login with fallback test user (test@example.com / any 8+ chars)</p>
              <p><strong>Clear Auth:</strong> Removes all authentication data from storage and cookies</p>
            </div>
          </div>
        </div>

        {/* Cache Debug Section */}
        <div className="mt-6">
          <CacheDebug />
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Debug Instructions</h2>
          <div className="text-yellow-700 space-y-2">
            <p>1. Open browser console to see detailed storage test results</p>
            <p>2. Check if localStorage/sessionStorage are blocked by extensions</p>
            <p>3. Try the test login to see if fallback authentication works</p>
            <p>4. Compare results between normal browser and incognito mode</p>
            <p>5. Use the Cache Debug section above to manage browser cache issues</p>
            <p>6. In development, use <code>window.alsCache</code> in console for cache management</p>
          </div>
        </div>
      </div>
    </div>
  );
}
