'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore, useAuthStoreState } from '@/store/auth-store';
import { useStudentStore } from '@/store/student-store';
import { SchoolCalendar } from '@/components/dashboard/school-calendar';
import { UpcomingEvents } from '@/components/dashboard/upcoming-events';
import { VisionMission } from '@/components/dashboard/vision-mission';
// Removed BarangayTabs UI per latest requirements
import { MapSkeleton } from '@/components/map/map-skeleton';
import { MapErrorBoundary } from '@/components/map/map-error-boundary';

// Dynamically import the map component to avoid SSR issues
const InteractiveMap = dynamic(
  () => import('@/components/map/interactive-map').then(mod => ({ default: mod.InteractiveMap })),
  {
    ssr: false,
    loading: () => <MapSkeleton className="h-[400px]" />
  }
);

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore(state => state.auth.user);
  const { user: authUser } = useAuthStoreState();

  // Get student store state and actions
  const {
    students,
    barangays,
    selectedBarangay,
    loadingBarangays,
    fetchStudents,
    fetchBarangays,
  } = useStudentStore();

  // Local loading state for initial data fetch
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Stable map key to prevent unnecessary re-mounts
  const [mapKey] = useState(() => `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Track if component has been mounted to prevent double initialization
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure the component is properly mounted
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Component mount tracking
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    if (!isMounted) return;

    const fetchData = async () => {
      setIsInitialLoading(true);
      try {
        await Promise.all([
          fetchStudents(),
          fetchBarangays()
        ]);
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchData();
  }, [isMounted, fetchStudents, fetchBarangays]);

  // Filter barangays based on user role
  const filteredBarangays = authUser?.role === 'admin' && authUser?.assignedBarangayId
    ? barangays.filter(b => b._id === authUser.assignedBarangayId)
    : barangays;

  // Calculate enrollment statistics for each barangay
  const enrollmentStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number }> = {};

    barangays.forEach(barangay => {
      const barangayStudents = students.data.filter(student => student.barangayId === barangay._id);
      stats[barangay._id] = {
        total: barangayStudents.length,
        active: barangayStudents.filter(student => student.status === 'active').length
      };
    });

    return stats;
  }, [students.data, barangays]);

  // Handle barangay tab selection with map navigation

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container space-y-4 sm:space-y-6 pb-8">
      {/* Welcome Header */}
      <div className="px-2 sm:px-0 mb-4 sm:mb-6 text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Alternative Learning System!
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-2xl">
          Manage your ALS programs and track student progress.
        </p>
      </div>

      {/* Main Dashboard Layout - Responsive Grid */}
      <div className="dashboard-grid grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 items-start">
        {/* Calendar - Full width on mobile, half on tablet, third on desktop */}
        <div className="h-full">
          <SchoolCalendar />
        </div>

        {/* Events List - Full width on mobile, half on tablet, third on desktop */}
        <div className="h-full">
          <UpcomingEvents />
        </div>

        {/* Vision and Mission - Full width on mobile and tablet, third on desktop */}
        <div className="h-full">
          <VisionMission />
        </div>
      </div>

      {/* Map Section */}
      <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Map View
          </h2>
        </div>

        {/* Interactive Map */}
        <div className="bg-white rounded-lg shadow-lg border-2 sm:border-4 border-blue-600">
          <div className="p-1">
            {loadingBarangays || isInitialLoading || !isMounted ? (
              <MapSkeleton className="h-[300px] sm:h-[400px]" />
            ) : (
              <MapErrorBoundary key={`error-boundary-${mapKey}`}>
                <div className="map-wrapper" key={`wrapper-${mapKey}`}>
                  <InteractiveMap
                    key={mapKey}
                    barangays={filteredBarangays}
                    selectedBarangay={selectedBarangay}
                    enrollmentStats={enrollmentStats}
                    className="h-[300px] sm:h-[400px]"
                  />
                </div>
              </MapErrorBoundary>
            )}
          </div>
        </div>

        {/* Map Legend/Info */}
        <div className="bg-white rounded-lg shadow-lg border-2 sm:border-4 border-blue-600 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-blue-600 mb-3 sm:mb-4">Map Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <span className="text-sm text-gray-700">Barangay Location</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-sm text-gray-700">Current Enrollees</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-700">Active Enrollees</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Click on map markers to view detailed enrollment information for each barangay.
            Use the tabs above to navigate to specific barangays.
          </p>
        </div>
      </div>
    </div>
  );
}
