'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { authService } from '@/services/auth-service';

export default function TestAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [authState, setAuthState] = useState<any>(null);
  
  const auth = useAuthStore(state => state.auth);
  const login = useAuthStore(state => state.login);
  const initialize = useAuthStore(state => state.initialize);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    addLog('🚀 TestAuthPage mounted');
    
    // Test auth state
    const testAuthState = () => {
      try {
        const user = authService.getCurrentUser();
        const token = authService.getToken();
        const isAuthenticated = authService.isAuthenticated();
        
        const cookies = document.cookie;
        
        setAuthState({
          user,
          token,
          isAuthenticated,
          cookies,
          storeAuth: auth
        });
        
        addLog(`📊 Auth State - User: ${user ? user.email : 'null'}, Token: ${token ? 'exists' : 'null'}, Authenticated: ${isAuthenticated}`);
        addLog(`🍪 Cookies: ${cookies || 'none'}`);
      } catch (error) {
        addLog(`❌ Error checking auth state: ${error}`);
      }
    };

    testAuthState();
    
    // Initialize auth store
    addLog('🔄 Initializing auth store...');
    initialize();
    
    // Check again after initialization
    setTimeout(testAuthState, 1000);
  }, [auth, initialize]);

  const handleTestLogin = async () => {
    try {
      addLog('🔐 Testing login with master@example.com...');
      
      const result = await login({
        email: 'master@example.com',
        password: 'password123',
        rememberMe: true
      });
      
      addLog(`✅ Login successful: ${result.user.email}`);
      
      // Check state after login
      setTimeout(() => {
        const user = authService.getCurrentUser();
        const token = authService.getToken();
        const isAuthenticated = authService.isAuthenticated();
        addLog(`📊 Post-login state - User: ${user ? user.email : 'null'}, Token: ${token ? 'exists' : 'null'}, Authenticated: ${isAuthenticated}`);
      }, 500);
      
    } catch (error) {
      addLog(`❌ Login failed: ${error}`);
    }
  };

  const handleTestLogout = async () => {
    try {
      addLog('🚪 Testing logout...');
      await authService.logout();
      addLog('✅ Logout successful');
      
      // Reinitialize to see the change
      initialize();
    } catch (error) {
      addLog(`❌ Logout failed: ${error}`);
    }
  };

  const handleClearAll = () => {
    try {
      addLog('🧹 Clearing all auth data...');
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie = 'als_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'als_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'als_assigned_barangay=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      addLog('✅ All auth data cleared');
      
      // Reinitialize
      initialize();
    } catch (error) {
      addLog(`❌ Clear failed: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Flow Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            <div className="space-y-4">
              <button
                onClick={handleTestLogin}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Test Login (master@example.com)
              </button>
              
              <button
                onClick={handleTestLogout}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
              >
                Test Logout
              </button>
              
              <button
                onClick={handleClearAll}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Clear All Auth Data
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>

          {/* Current State */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
            {authState && (
              <div className="space-y-2 text-sm">
                <div><strong>Store Authenticated:</strong> {auth.isAuthenticated ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Store User:</strong> {auth.user ? auth.user.email : 'null'}</div>
                <div><strong>Store Token:</strong> {auth.token ? '✅ Exists' : '❌ None'}</div>
                <div><strong>Service Authenticated:</strong> {authState.isAuthenticated ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Service User:</strong> {authState.user ? authState.user.email : 'null'}</div>
                <div><strong>Service Token:</strong> {authState.token ? '✅ Exists' : '❌ None'}</div>
                <div><strong>Cookies:</strong> {authState.cookies || 'none'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-2 bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            Clear Logs
          </button>
        </div>
      </div>
    </div>
  );
}
