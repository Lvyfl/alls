'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useProgressStore } from '@/store/progress-store';

// Components
import { BarangayTabs } from '@/components/students/barangay-tabs';
import { BarangayTabsSkeleton } from '@/components/students/barangay-tabs-skeleton';

import { ProgressTable } from '@/components/progress/progress-table';
import { ProgressTableSkeleton } from '@/components/progress/progress-table-skeleton';

export default function ProgressPage() {
  // Get user from auth store
  const user = useAuthStore(state => state.auth.user);

  // Get progress store state and actions
  const {
    students,
    barangays,
    selectedBarangay,
    loadingBarangays,
    loadingStudents,
    setSelectedBarangay,
    getFilteredStudents,
    initializeWithUser,
    fetchStudents,
  } = useProgressStore();

  // Fetch data on component mount with user context for proper barangay selection
  useEffect(() => {
    initializeWithUser(user);
  }, [initializeWithUser, user]);

  // Refetch students when page becomes visible to ensure deleted students are removed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refetch students to sync with masterlist
        fetchStudents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStudents]);

  // Filter barangays based on user role with memoization
  const filteredBarangays = useMemo(() => {
    return user?.role === 'admin' && user?.assignedBarangayId
    ? barangays.filter(b => b._id === user.assignedBarangayId)
    : barangays;
  }, [barangays, user?.role, user?.assignedBarangayId]);

  return (
    <div className="space-y-6">
      {/* Barangay Tabs */}
      {loadingBarangays ? (
        <BarangayTabsSkeleton />
      ) : (
        <BarangayTabs
          barangays={filteredBarangays}
          selectedBarangay={user?.role === 'master_admin' ? selectedBarangay || 'all' : selectedBarangay}
          onSelectBarangay={setSelectedBarangay}
          showAllOption={user?.role === 'master_admin'}
        />
      )}

      {/* Progress Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-4 border-blue-600 dark:border-blue-500">
        <div className="p-1">
          {loadingStudents ? (
            <ProgressTableSkeleton />
          ) : (
            <ProgressTable
              students={getFilteredStudents()}
              barangays={barangays}
              selectedBarangay={selectedBarangay}
            />
          )}
        </div>
      </div>
    </div>
  );
}
