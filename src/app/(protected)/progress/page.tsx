'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useProgressStore } from '@/store/progress-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Components
import { BarangayTabs } from '@/components/students/barangay-tabs';
import { BarangayTabsSkeleton } from '@/components/students/barangay-tabs-skeleton';

import { ProgressTable } from '@/components/progress/progress-table';
import { ProgressTableSkeleton } from '@/components/progress/progress-table-skeleton';

export default function ProgressPage() {
  // Get user from auth store
  const user = useAuthStore(state => state.auth.user);
  
  // Program filter state
  const [programFilter, setProgramFilter] = useState<string>('all');

  // Available program levels
  const programLevels = [
    'Basic Literacy (BLP)',
    'A&E Elementary',
    'A&E Secondary'
  ];

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
    return user?.role === 'teacher' && user?.assignedBarangayId
      ? barangays.filter(b => b._id === user.assignedBarangayId)
      : barangays;
  }, [barangays, user?.role, user?.assignedBarangayId]);

  // Get base filtered students (by barangay)
  const baseFilteredStudents = getFilteredStudents();

  // Filter students by program
  const filteredStudentsByProgram = useMemo(() => {
    if (programFilter === 'all') {
      return baseFilteredStudents;
    }
    return baseFilteredStudents.filter(student => student.program === programFilter);
  }, [baseFilteredStudents, programFilter]);

  return (
    <div className="space-y-6">
      {/* Barangay Tabs */}
      {loadingBarangays ? (
        <BarangayTabsSkeleton />
      ) : (
        <BarangayTabs
          barangays={filteredBarangays}
          selectedBarangay={user?.role === 'admin' ? selectedBarangay || 'all' : selectedBarangay}
          onSelectBarangay={setSelectedBarangay}
          showAllOption={user?.role === 'admin'}
        />
      )}

      {/* Program Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by Program:
        </label>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programLevels.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Progress Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-4 border-blue-600 dark:border-blue-500">
        <div className="p-1">
          {loadingStudents ? (
            <ProgressTableSkeleton />
          ) : (
            <ProgressTable
              students={filteredStudentsByProgram}
              barangays={barangays}
              selectedBarangay={selectedBarangay}
            />
          )}
        </div>
      </div>
    </div>
  );
}
