'use client';

import Image from 'next/image';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStoreState, useAuthStoreActions } from '@/store/auth-store';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStoreState();
  const { initialize } = useAuthStoreActions();
  const isRegisterPage = pathname === '/register';

  // Add loading state to prevent flash of login page
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from storage
    initialize();

    // Set loading to false after a short delay
    // This gives middleware time to handle redirects
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [initialize]);

  // If loading, show a minimal loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Let the middleware handle all authentication redirects
  // Removing the client-side redirect logic to prevent infinite loops

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ALS logo with low opacity */}
      <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none z-0">
        <div className="relative h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] md:h-[800px] md:w-[800px]">
          <Image
            src="/images/als_logo.png"
            alt="ALS Logo Background"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
      </div>

      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-8 z-10">
        {/* Left side with logos and text - only shown on login page */}
        {!isRegisterPage && (
          <div className="flex flex-col items-center md:items-start space-y-4 sm:space-y-6 mb-6 md:mb-0 md:w-1/2">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative h-16 w-28 sm:h-24 sm:w-40">
                <Image
                  src="/images/deped_logo.png"
                  alt="DepEd Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <div className="relative h-20 w-28 sm:h-28 sm:w-40">
                <Image
                  src="/images/als_logo.png"
                  alt="ALS Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            </div>

            <div className="text-center md:text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">ALTERNATIVE LEARNING SYSTEM</h1>
              <p className="mt-1 sm:mt-2 text-base sm:text-lg md:text-xl text-gray-600">LIFE LONG LEARNING</p>
            </div>
          </div>
        )}

        {/* Right side with auth form */}
        <div className={!isRegisterPage ? "w-full md:w-1/2" : "w-full"}>
          {children}
        </div>
      </div>
    </div>
  );
}
