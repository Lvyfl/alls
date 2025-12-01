/**
 * Cache Management Utility for ALS Student Tracker
 * Handles browser cache invalidation and cleanup
 */

export interface CacheInfo {
  storeVersion: string | null;
  storeData: any;
  authData: {
    user: string | null;
    token: string | null;
    role: string | null;
  };
  totalCacheSize: number;
  cacheKeys: string[];
}

export class CacheManager {
  private static readonly STORE_KEY = 'als-student-tracker';
  private static readonly VERSION_KEY = 'als-student-tracker-version';
  private static readonly AUTH_KEYS = [
    'als_user',
    'als_token', 
    'als_user_role',
    'als_assigned_barangay',
    'als_users'
  ];

  /**
   * Get comprehensive cache information
   */
  static getCacheInfo(): CacheInfo {
    const cacheKeys: string[] = [];
    let totalSize = 0;

    // Collect all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        cacheKeys.push(key);
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
    }

    return {
      storeVersion: localStorage.getItem(this.VERSION_KEY),
      storeData: this.getStoreData(),
      authData: {
        user: localStorage.getItem('als_user'),
        token: localStorage.getItem('als_token'),
        role: localStorage.getItem('als_user_role'),
      },
      totalCacheSize: totalSize,
      cacheKeys: cacheKeys.filter(key => key.startsWith('als')),
    };
  }

  /**
   * Get the current store data from cache
   */
  static getStoreData(): any {
    try {
      const storeData = localStorage.getItem(this.STORE_KEY);
      return storeData ? JSON.parse(storeData) : null;
    } catch (error) {
      console.warn('Failed to parse store data:', error);
      return null;
    }
  }

  /**
   * Clear all ALS-related cache data
   */
  static clearAllCache(): void {
    console.log('🧹 Clearing all ALS cache data...');
    
    const keysToRemove: string[] = [];
    
    // Find all ALS-related keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('als')) {
        keysToRemove.push(key);
      }
    }

    // Remove all found keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  ❌ Removed: ${key}`);
    });

    // Also clear sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('als')) {
        sessionStorage.removeItem(key);
        console.log(`  ❌ Removed from session: ${key}`);
      }
    }

    console.log(`✅ Cleared ${keysToRemove.length} cache entries`);
  }

  /**
   * Clear only store cache (preserve auth data)
   */
  static clearStoreCache(): void {
    // Skip on server-side rendering
    if (typeof window === 'undefined') {
      return;
    }

    console.log('🧹 Clearing store cache...');

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORE_KEY)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  ❌ Removed: ${key}`);
    });

    console.log(`✅ Cleared ${keysToRemove.length} store cache entries`);
  }

  /**
   * Clear only auth cache (preserve store data)
   */
  static clearAuthCache(): void {
    console.log('🧹 Clearing auth cache...');
    
    this.AUTH_KEYS.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      console.log(`  ❌ Removed: ${key}`);
    });

    console.log('✅ Cleared auth cache');
  }

  /**
   * Validate cache integrity
   */
  static validateCache(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Skip on server-side rendering
    if (typeof window === 'undefined') {
      return { isValid: true, issues: [] };
    }

    try {
      // Check store data structure
      const storeData = this.getStoreData();
      if (storeData) {
        if (!storeData.state) {
          issues.push('Store data missing state property');
        }

        if (storeData.state && typeof storeData.state !== 'object') {
          issues.push('Store state is not an object');
        }
      }

      // Check version consistency
      const version = localStorage.getItem(this.VERSION_KEY);
      if (!version) {
        issues.push('Store version not found');
      }

    } catch (error) {
      issues.push(`Cache validation error: ${error}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Force refresh the application (useful after cache clear)
   */
  static forceRefresh(): void {
    console.log('🔄 Force refreshing application...');
    window.location.reload();
  }

  /**
   * Check if running in development mode
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Development helper: Add cache management to window object
   */
  static exposeToWindow(): void {
    if (this.isDevelopment() && typeof window !== 'undefined') {
      (window as any).alsCache = {
        info: () => this.getCacheInfo(),
        clearAll: () => this.clearAllCache(),
        clearStore: () => this.clearStoreCache(),
        clearAuth: () => this.clearAuthCache(),
        validate: () => this.validateCache(),
        refresh: () => this.forceRefresh(),
      };
      
      console.log('🛠️ Cache management tools available at window.alsCache');
      console.log('   - alsCache.info() - Get cache information');
      console.log('   - alsCache.clearAll() - Clear all cache');
      console.log('   - alsCache.clearStore() - Clear store cache only');
      console.log('   - alsCache.clearAuth() - Clear auth cache only');
      console.log('   - alsCache.validate() - Validate cache integrity');
      console.log('   - alsCache.refresh() - Force refresh application');
    }
  }
}

// Auto-expose in development
if (typeof window !== 'undefined') {
  CacheManager.exposeToWindow();
}
