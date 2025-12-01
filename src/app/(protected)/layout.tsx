'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useStudentStore } from '@/store/student-store';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { HeaderSearch } from '@/components/layout/header-search';
import { AccessibilityControls } from '@/components/accessibility/accessibility-controls';
import { authService } from '@/services/auth-service';
import {
  LayoutDashboard,
  Users,
  LineChart,
  Settings,
  LogOut,
  ChevronDown,
  Shield
} from 'lucide-react';

// Navigation items for all users
const commonNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Student Master List', href: '/students', icon: Users },
  { name: 'Student Score Summary', href: '/progress', icon: LineChart },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Navigation items only for master admin
const masterAdminNavItems: typeof commonNavItems = [
  { name: 'Admin Management', href: '/admin', icon: Shield },
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasPendingNotifications, setHasPendingNotifications] = useState(false);

  // Handle window resize to auto-close mobile menu on larger screens and adjust sidebar
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      // Auto-close mobile menu on larger screens
      if (width >= 1024) {
        setIsMobileMenuOpen(false);
      }
      
      // Auto-collapse sidebar on very small screens
      if (width < 640) {
        setIsSidebarOpen(false);
      }
    };

    // Initial check
    handleResize();

    // Add debounced resize listener
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Get auth store state and actions
  const user = useAuthStore(state => state.auth.user);
  const logout = useAuthStore(state => state.logout);
  const initialize = useAuthStore(state => state.initialize);
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.name || 'ALS Admin';
  const avatarInitial = (user?.firstName?.[0] || user?.name?.[0] || 'A').toUpperCase();
  
  // Get barangays for displaying assigned barangay name
  const { barangays, fetchBarangays } = useStudentStore();

  // Determine navigation items based on user role
  const navItems = user?.role === 'master_admin'
    ? [...commonNavItems, ...masterAdminNavItems]
    : commonNavItems;

  // Initialize auth state
  useEffect(() => {
    try {
      initialize();
    } catch (error) {
      console.error('Error initializing auth in layout:', error);
    }
  }, [initialize]);

  // Fetch barangays if needed (memoized to prevent unnecessary calls)
  useEffect(() => {
    if (barangays.length === 0) {
      fetchBarangays();
    }
  }, [barangays.length]); // Removed fetchBarangays from deps to prevent re-runs

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;

    const loadNotifications = async () => {
      if (user?.role !== 'master_admin') {
        if (isMounted) {
          setHasPendingNotifications(false);
        }
        return;
      }

      try {
        const requests = await authService.fetchPasswordResetRequests();
        if (isMounted) {
          setHasPendingNotifications(
            requests.some((req: any) => req.status === 'pending')
          );
        }
      } catch (error) {
        console.error('Error loading password reset notifications:', error);
      }
    };

    // Initial load
    loadNotifications();

    // Set up real-time polling for master admin
    if (user?.role === 'master_admin') {
      // Only poll when page is visible
      const startPolling = () => {
        if (interval) return; // Already polling
        
          // Poll every 10 seconds to reduce server load (was 2 seconds)
          interval = setInterval(loadNotifications, 10000);
      };

      const stopPolling = () => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      };

      // Handle visibility change
      const handleVisibilityChange = () => {
        if (document.hidden) {
          stopPolling();
        } else {
          startPolling();
          // Also load immediately when page becomes visible
          loadNotifications();
        }
      };

      // Start polling if page is visible
      if (!document.hidden) {
        startPolling();
      }

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        isMounted = false;
        stopPolling();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [user?.role]);

  // Helper function to get barangay name
  const getBarangayName = (barangayId?: string) => {
    if (!barangayId) return null;
    // Try matching by _id first (MongoDB format), then by id (JSON format)
    const barangay = barangays.find((b) => b._id === barangayId || (b as any).id === barangayId);
    return barangay?.name || null;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-theme-background overflow-hidden">
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`bg-blue-900 dark:bg-slate-800 text-white ${
            isSidebarOpen ? 'w-64' : 'w-20'
          } transition-all duration-300 ease-in-out flex flex-col shadow-2xl relative z-50
          fixed lg:static h-full
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Sidebar header with white background and rounded bottom */}
          <div className="bg-white dark:bg-slate-700 text-blue-900 dark:text-white rounded-b-2xl mb-6 shadow-lg relative">
            <div className={`p-4 ${isSidebarOpen ? '' : 'px-2'}`}>
              <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                {isSidebarOpen ? (
                  <div className="flex items-center space-x-3">
                    <div className="relative h-12 w-12 bg-blue-50 dark:bg-slate-600 rounded-xl p-2 shadow-sm">
                      <Image
                        src="/images/als_logo.png"
                        alt="ALS Logo"
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm leading-tight">ALTERNATIVE</span>
                      <span className="font-bold text-sm leading-tight">LEARNING SYSTEM</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-12 w-12 bg-blue-50 dark:bg-slate-600 rounded-xl p-2 shadow-sm">
                    <Image
                      src="/images/als_logo.png"
                      alt="ALS Logo"
                      fill
                      style={{ objectFit: 'contain' }}
                      className="rounded-lg"
                    />
                  </div>
                )}

                {isSidebarOpen && (
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="text-blue-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-lg p-2 transition-all duration-200"
                    title="Collapse sidebar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Expand button for collapsed state */}
            {!isSidebarOpen && (
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                  title="Expand sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* User profile */}
          <div className={`${isSidebarOpen ? 'px-4' : 'px-2'} pb-4 mb-4`}>
            <div className={`bg-blue-800/50 backdrop-blur-sm rounded-xl p-3 border border-blue-700/30 ${isSidebarOpen ? '' : 'flex justify-center'}`}>
              <div className={`flex items-center ${isSidebarOpen ? '' : 'justify-center'}`}>
                {user?.profilePicture ? (
                  <div className="flex-shrink-0">
                    <img
                      src={user.profilePicture}
                      alt={user.name || 'Profile'}
                      className="h-10 w-10 rounded-full object-cover border-2 border-blue-300 dark:border-blue-500 shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-2.5 text-blue-900 shadow-sm">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                {isSidebarOpen && (() => {
                  const barangayName = user?.role === 'admin' && user?.assignedBarangayId 
                    ? getBarangayName(user.assignedBarangayId) 
                    : null;
                  
                  return (
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.name || 'Staff Name'}</p>
                      <p className="text-xs text-blue-200 truncate">
                        {user?.role === 'master_admin' ? 'Master Admin' : 'Regular Admin'}
                        {barangayName && (
                          <span className="ml-1 text-blue-300">• {barangayName}</span>
                        )}
                      </p>
                      <Link 
                        href="/profile" 
                        className="flex items-center text-xs text-blue-300 hover:text-white cursor-pointer mt-1 transition-colors duration-200"
                      >
                        <span>View profile</span>
                        <ChevronDown size={10} className="ml-1" />
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>



          {/* General divider */}
          {isSidebarOpen && (
            <div className="px-4 mb-4">
              <div className="flex items-center">
                <span className="text-xs font-semibold text-blue-300 tracking-wider">GENERAL</span>
                <div className="flex-grow ml-3 h-px bg-gradient-to-r from-blue-400/50 to-transparent"></div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 sidebar-nav">
            <ul className={`space-y-2 ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
              {navItems.map((item) => {
                const showNavNotification =
                  item.href === "/settings" && hasPendingNotifications;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`nav-item group relative flex items-center rounded-xl transition-all duration-200 ${
                        pathname === item.href
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/25"
                          : "text-blue-100 hover:bg-blue-800/60 hover:text-white"
                      } ${isSidebarOpen ? "p-3" : "p-3 justify-center"}`}
                      title={!isSidebarOpen ? item.name : undefined}
                      onClick={() => {
                        console.log("Navigation clicked:", item.name, item.href);
                        if (window.innerWidth < 1024) {
                          setIsMobileMenuOpen(false);
                        }
                      }}
                    >
                      <div
                        className={`flex items-center justify-center ${
                          isSidebarOpen ? "relative w-full" : "w-full relative"
                        }`}
                      >
                        <item.icon
                          size={20}
                          className={`flex-shrink-0 transition-transform duration-200 ${
                            pathname === item.href ? "scale-110" : "group-hover:scale-105"
                          }`}
                        />
                        {!isSidebarOpen && showNavNotification && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                        {isSidebarOpen && (
                          <span className="ml-3 font-medium text-sm truncate flex-1 relative">
                            {item.name}
                            {showNavNotification && (
                              <span className="absolute -top-1 -right-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                            )}
                          </span>
                        )}
                      </div>

                      {pathname === item.href && (
                        <div className="nav-indicator absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                      )}

                      {!isSidebarOpen && (
                        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                          {item.name}
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout button */}
          <div className={`${isSidebarOpen ? 'p-4' : 'p-2'} mt-auto`}>
            <button
              onClick={handleLogout}
              className={`group relative flex items-center w-full text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${
                isSidebarOpen ? 'p-3 justify-start' : 'p-3 justify-center'
              }`}
              title={!isSidebarOpen ? 'Log Out' : undefined}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {isSidebarOpen && <span className="ml-3 font-medium text-sm">LOG OUT</span>}

              {/* Tooltip for collapsed state */}
              {!isSidebarOpen && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  Log Out
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto lg:ml-0">
          <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-30">
            <div className="px-4 py-4 sm:px-6 lg:px-8">
              {/* Mobile Menu Button */}
              <div className="lg:hidden mb-3">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex justify-between items-center">
                <h1 className="text-lg font-bold text-gray-800 dark:text-white uppercase">
                  {navItems.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h1>

                <div className="flex items-center gap-4">
                  {/* Header Search */}
                  <HeaderSearch />

                  {/* Accessibility Controls */}
                  <AccessibilityControls variant="header" />

                  {/* User Info - Only show on dashboard */}
                  {pathname === '/dashboard' && (
                    <div className="flex items-center gap-3">
                      {user?.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={displayName}
                          className="h-10 w-10 rounded-full object-cover border-2 border-blue-500 dark:border-blue-300"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center border-2 border-blue-500 dark:border-blue-300 text-base font-semibold text-blue-700 dark:text-blue-100">
                          {avatarInitial}
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Hello
                        </p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">
                          {displayName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white uppercase truncate flex-1">
                    {navItems.find(item => item.href === pathname)?.name || 'Dashboard'}
                  </h1>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {/* Accessibility Controls */}
                    <AccessibilityControls variant="header" />

                    {/* User Info - Only show on dashboard */}
                    {pathname === '/dashboard' && (
                      <div className="flex items-center gap-2">
                        {user?.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt={displayName}
                            className="h-8 w-8 rounded-full object-cover border border-blue-500 dark:border-blue-300"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center border border-blue-500 dark:border-blue-300 text-sm font-semibold text-blue-700 dark:text-blue-100">
                            {avatarInitial}
                          </div>
                        )}
                        <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate max-w-[120px]">
                          {displayName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Header Search */}
                <HeaderSearch />
              </div>
            </div>
          </header>

          <main className="p-3 sm:p-4 md:p-6 bg-theme-background min-h-[calc(100vh-80px)]">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
