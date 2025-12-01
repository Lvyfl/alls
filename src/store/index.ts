import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { StoreState } from '@/types';
import { AuthState } from '@/types/auth';
import { CacheManager } from '@/utils/cache-manager';

// Import store slices
import { createStudentSlice } from './slices/students.slice';
import { createBarangaySlice } from './slices/barangaySlice';
import { createModuleSlice } from './slices/moduleSlice';
import { createProgressSlice } from './slices/progressSlice';
import { createAuthSlice } from './slices/auth-slice';

// Store version for cache invalidation
const STORE_VERSION = '1.1.0'; // Increment this when store structure changes
const STORE_KEY = 'als-student-tracker';

// Extended store state with auth (excluding events for now since it's handled separately)
interface ExtendedStoreState extends Omit<StoreState, 'events'> {
  auth: AuthState;
}

// Cache invalidation utility - only run on client side
const clearIncompatibleCache = () => {
  // Skip on server-side rendering
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const storedVersion = localStorage.getItem(`${STORE_KEY}-version`);
    if (storedVersion !== STORE_VERSION) {
      console.log('🔄 Store structure updated, clearing incompatible cache...');
      console.log(`   Previous version: ${storedVersion || 'unknown'}`);
      console.log(`   Current version: ${STORE_VERSION}`);

      // Validate current cache before clearing
      const validation = CacheManager.validateCache();
      if (!validation.isValid) {
        console.log('⚠️ Cache validation issues found:', validation.issues);
      }

      // Clear only store-related cache (preserve auth data)
      CacheManager.clearStoreCache();

      // Update the version
      localStorage.setItem(`${STORE_KEY}-version`, STORE_VERSION);

      console.log('✅ Cache cleared successfully');
    } else {
      // Even if versions match, validate cache integrity
      const validation = CacheManager.validateCache();
      if (!validation.isValid) {
        console.log('⚠️ Cache integrity issues found, clearing cache:', validation.issues);
        CacheManager.clearStoreCache();
        localStorage.setItem(`${STORE_KEY}-version`, STORE_VERSION);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not clear cache:', error);
    // If there's an error, try to clear everything as a last resort
    try {
      CacheManager.clearStoreCache();
      localStorage.setItem(`${STORE_KEY}-version`, STORE_VERSION);
      console.log('🧹 Performed emergency cache clear');
    } catch (emergencyError) {
      console.error('❌ Emergency cache clear failed:', emergencyError);
    }
  }
};

// Clear incompatible cache before creating store - only on client side
// This will be called when the store is first accessed on the client
let cacheCleared = false;
const ensureCacheCleared = () => {
  if (typeof window !== 'undefined' && !cacheCleared) {
    clearIncompatibleCache();
    cacheCleared = true;
  }
};

// Create the store with all slices
export const useStore = create<ExtendedStoreState>()(
  devtools(
    persist(
      immer((...a) => ({
        // Combine all slices
        ...createStudentSlice(...a),
        ...createBarangaySlice(...a),
        ...createModuleSlice(...a),
        ...createProgressSlice(...a),
        ...createAuthSlice(...a),
      })),
      {
        name: STORE_KEY,
        version: 1, // Zustand's built-in versioning
        // Only persist specific parts of the state
        partialize: (state) => ({
          students: {
            filters: state.students?.filters || {},
          },
          progress: {
            filters: state.progress?.filters || {},
          },
          // Don't persist auth state here as it's handled by the auth service
        }),
        // Handle migration for version changes
        migrate: (persistedState: any, version: number) => {
          console.log('🔄 Migrating store from version', version);

          // If version is different, return a clean state
          if (version !== 1) {
            console.log('🧹 Returning clean state due to version mismatch');
            return {
              students: { filters: {} },
              progress: { filters: {} },
            };
          }

          // Ensure the persisted state has the expected structure
          return {
            students: {
              filters: persistedState?.students?.filters || {},
            },
            progress: {
              filters: persistedState?.progress?.filters || {},
            },
          };
        },
        // Add error handling for storage issues
        onRehydrateStorage: () => {
          // Ensure cache is cleared before rehydration
          ensureCacheCleared();

          return (state, error) => {
            if (error) {
              console.error('❌ Store rehydration failed:', error);
              // Clear the problematic cache
              try {
                localStorage.removeItem(STORE_KEY);
                console.log('🧹 Cleared problematic cache');
              } catch (clearError) {
                console.warn('⚠️ Could not clear cache:', clearError);
              }
            } else {
              console.log('✅ Store rehydrated successfully');
            }
          };
        },
      }
    )
  )
);

// Export type for the store
export type AppStore = typeof useStore;

// Export a hook that can be reused to resolve the store
export const useAppStore = useStore;

// Export convenience hooks for accessing store state and actions
// Note: These will be properly typed after we fix the type definitions
export const useStoreState = useStore;
export const useStoreActions = useStore;
