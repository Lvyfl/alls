import { StateCreator } from 'zustand';
import { 
  AuthState, 
  LoginCredentials, 
  RegisterCredentials 
} from '@/types/auth';
import { authService } from '@/services/auth-service';

// Initial state for the auth slice
const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

// Create the auth slice
export const createAuthSlice: StateCreator<
  any,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  { auth: AuthState }
> = (set, get) => ({
  auth: {
    ...initialAuthState,
    
    // Initialize auth state from storage
    initialize: () => {
      set(state => {
        const user = authService.getCurrentUser();
        const token = authService.getToken();
        const isAuthenticated = authService.isAuthenticated();
        
        state.auth.user = user;
        state.auth.token = token;
        state.auth.isAuthenticated = isAuthenticated;
      }, false, 'auth/initialize');
    },
    
    // Login action
    login: async (credentials: LoginCredentials) => {
      set(state => {
        state.auth.isLoading = true;
        state.auth.error = null;
      }, false, 'auth/login');
      
      try {
        const response = await authService.login(credentials);
        
        set(state => {
          state.auth.user = response.user;
          state.auth.token = response.token;
          state.auth.isAuthenticated = true;
          state.auth.isLoading = false;
        }, false, 'auth/login/success');
        
        return response;
      } catch (error) {
        set(state => {
          state.auth.isLoading = false;
          state.auth.error = error instanceof Error ? error.message : 'Login failed';
        }, false, 'auth/login/error');
        
        throw error;
      }
    },
    
    // Register action
    register: async (userData: RegisterCredentials) => {
      set(state => {
        state.auth.isLoading = true;
        state.auth.error = null;
      }, false, 'auth/register');
      
      try {
        const response = await authService.register(userData);
        
        return response;
      } catch (error) {
        set(state => {
          state.auth.isLoading = false;
          state.auth.error = error instanceof Error ? error.message : 'Registration failed';
        }, false, 'auth/register/error');
        
        throw error;
      }
    },
    
    // Logout action
    logout: async () => {
      set(state => {
        state.auth.isLoading = true;
      }, false, 'auth/logout');
      
      try {
        await authService.logout();
        
        set(state => {
          state.auth.user = null;
          state.auth.token = null;
          state.auth.isAuthenticated = false;
          state.auth.isLoading = false;
        }, false, 'auth/logout/success');
      } catch (error) {
        set(state => {
          state.auth.isLoading = false;
          state.auth.error = error instanceof Error ? error.message : 'Logout failed';
        }, false, 'auth/logout/error');
        
        throw error;
      }
    },
    
    // Clear error action
    clearError: () => {
      set(state => {
        state.auth.error = null;
      }, false, 'auth/clearError');
    }
  }
});
