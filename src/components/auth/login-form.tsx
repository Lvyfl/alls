'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormValues } from '@/validators/auth-validators';
import { useAuthStoreState, useAuthStoreActions } from '@/store/auth-store';
import { authService } from '@/services/auth-service';
import type { UserRole } from '@/types/auth';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [emailRole, setEmailRole] = useState<UserRole | null>(null);
  const [roleMessage, setRoleMessage] = useState<string>('');

  // Get auth store actions and state
  const { isLoading, error } = useAuthStoreState();
  const { login, initialize, clearError } = useAuthStoreActions();

  // Initialize auth state when component mounts
  // We don't need to handle redirect here anymore as it's handled by the middleware and auth layout
  useEffect(() => {
    // Initialize auth state
    initialize();
  }, [initialize]);

  // Initialize form with React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const watchedEmail = watch('email');
  const watchedPassword = watch('password');

  useEffect(() => {
    let isActive = true;
    setRoleMessage('');

    // Handle email change to fetch user role
    const handleEmailChange = (email: string) => {
      setEmailRole(null);
      setRoleMessage('');
      clearError();

      if (!email) return;

      // Debounce the API call
      const timer = setTimeout(async () => {
        let isActive = true;
        
        try {
          const users = await authService.getStoredUsers();
          const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
          
          if (isActive) {
            setEmailRole(matched?.role ?? null);
          }
        } catch (err) {
          console.error('Failed to fetch user role for email', err);
          if (isActive) {
            setEmailRole(null);
          }
        }
      }, 400);

      return () => {
        isActive = false;
        clearTimeout(timer);
      };
    };

    handleEmailChange(watchedEmail);

    return () => {
      isActive = false;
    };
  }, [watchedEmail]);

  const canShowForgotPassword = false; // Disabled since password reset is removed

  // Handle form submission
  const onSubmit = async (data: LoginFormValues) => {
    try {
      // Clear any previous errors
      clearError();

      const allowPasswordBypass = false; // Disabled since password reset is removed

      // Perform login - after successful login, middleware will handle the redirect
      await login({
        email: data.email,
        password: data.password || '',
        rememberMe: data.rememberMe,
        allowPasswordBypass,
      });

      // Force a page refresh to let middleware handle the redirect
      // This ensures the middleware sees the updated cookies and redirects properly
      window.location.reload();
    } catch (error) {
      // Error is already handled by the store
      console.error('Login error:', error);
    }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto p-4 sm:p-6 bg-white rounded-lg border-4 sm:border-6 border-blue-900 shadow-md relative z-10">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4 sm:mb-6">LOG IN</h2>

      {error && (
        <div className="mb-4 p-2 sm:p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            className={`mt-1 block w-full px-3 py-2 border ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-black`}
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter Password"
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-black`}
              {...register('password')}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs sm:text-sm text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && !!watchedPassword?.length && (
            <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.password.message}</p>
          )}
          {/* Password bypass functionality removed */}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              {...register('rememberMe')}
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-xs sm:text-sm text-gray-700">
              Remember me
            </label>
          </div>

          {/* Forgot password functionality removed */}
        </div>

        {roleMessage && (
          <div className="text-xs sm:text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-md p-2">
            {roleMessage}
          </div>
        )}

        <div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'LOG IN'}
          </button>
        </div>


      </form>
    </div>
  );
}
