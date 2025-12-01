import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import { AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { authService } from '@/services/auth-service';
import { logStorageTestResults } from '@/utils/storage-debug';

// Initial state for the auth store
const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

// Create the auth store with optimized configuration
export const useAuthStore = create<{
  auth: AuthState;
  initialize: () => void;
  login: (credentials: LoginCredentials) => Promise<any>;
  register: (userData: RegisterCredentials) => Promise<any>;
  logout: () => Promise<void>;
  clearError: () => void;
}>()(
  subscribeWithSelector(
    immer((set) => ({
    auth: initialAuthState,

    // Initialize auth state from storage
    initialize: () => {
      try {
        // Run storage debug in development
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Initializing auth store...');
          logStorageTestResults();
        }

        const user = authService.getCurrentUser();
        const token = authService.getToken();
        const isAuthenticated = authService.isAuthenticated();

        console.log('🔍 Auth initialization results:', {
          user: user ? { id: user._id, email: user.email, role: user.role } : null,
          token: token ? `${token.substring(0, 20)}...` : null,
          isAuthenticated
        });

        set((state) => {
          state.auth.user = user;
          state.auth.token = token;
          state.auth.isAuthenticated = isAuthenticated;
          state.auth.isLoading = false;
        });
      } catch (error) {
        console.error('❌ Error initializing auth store:', error);
        // Run storage debug on error to help diagnose issues
        logStorageTestResults();

        set((state) => {
          state.auth.user = null;
          state.auth.token = null;
          state.auth.isAuthenticated = false;
          state.auth.isLoading = false;
          state.auth.error = 'Failed to initialize authentication';
        });
      }
    },

    // Login action
    login: async (credentials: LoginCredentials) => {
      console.log('🔐 Starting login process for:', credentials.email);

      set((state) => {
        state.auth.isLoading = true;
        state.auth.error = null;
      });

      try {
        const response = await authService.login(credentials);

        console.log('✅ Login successful:', {
          user: { id: response.user._id, email: response.user.email, role: response.user.role },
          token: response.token ? `${response.token.substring(0, 20)}...` : null
        });

        set((state) => {
          state.auth.user = response.user;
          state.auth.token = response.token;
          state.auth.isAuthenticated = true;
          state.auth.isLoading = false;
        });

        return response;
      } catch (error) {
        console.error('❌ Login failed:', error);

        set((state) => {
          state.auth.isLoading = false;
          state.auth.error = error instanceof Error ? error.message : 'Login failed';
        });

        throw error;
      }
    },

    // Register action
    register: async (userData: RegisterCredentials) => {
      set((state) => {
        state.auth.isLoading = true;
        state.auth.error = null;
      });

      try {
        const response = await authService.register(userData);

        return response;
      } catch (error) {
        set((state) => {
          state.auth.isLoading = false;
          state.auth.error = error instanceof Error ? error.message : 'Registration failed';
        });

        throw error;
      }
    },

    // Logout action
    logout: async () => {
      set((state) => {
        state.auth.isLoading = true;
      });

      try {
        await authService.logout();

        set((state) => {
          state.auth.user = null;
          state.auth.token = null;
          state.auth.isAuthenticated = false;
          state.auth.isLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.auth.isLoading = false;
          state.auth.error = error instanceof Error ? error.message : 'Logout failed';
        });

        throw error;
      }
    },

    // Clear error action
    clearError: () => {
      set((state) => {
        state.auth.error = null;
      });
    }
  }))
  )
);

// Stable selector hooks to prevent infinite loops
export const useAuthStoreActions = () => {
  const initialize = useAuthStore(state => state.initialize);
  const login = useAuthStore(state => state.login);
  const register = useAuthStore(state => state.register);
  const logout = useAuthStore(state => state.logout);
  const clearError = useAuthStore(state => state.clearError);

  return useMemo(() => ({
    initialize,
    login,
    register,
    logout,
    clearError,
  }), [initialize, login, register, logout, clearError]);
};

export const useAuthStoreState = () => {
  const user = useAuthStore(state => state.auth.user);
  const token = useAuthStore(state => state.auth.token);
  const isAuthenticated = useAuthStore(state => state.auth.isAuthenticated);
  const isLoading = useAuthStore(state => state.auth.isLoading);
  const error = useAuthStore(state => state.auth.error);

  return useMemo(() => ({
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
  }), [user, token, isAuthenticated, isLoading, error]);
};
