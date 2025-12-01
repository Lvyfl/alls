'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useSearchStore } from '@/store/search-store';
import { useStudentStore } from '@/store/student-store';
import { useProgressStore } from '@/store/progress-store';

export function HeaderSearch() {
  const pathname = usePathname();
  const { query, currentPage, setQuery, setCurrentPage, getPlaceholder } = useSearchStore();
  const { setSearchQuery: setStudentSearchQuery } = useStudentStore();
  const { setSearchQuery: setProgressSearchQuery } = useProgressStore();
  
  const [localQuery, setLocalQuery] = useState(query);

  // Update current page based on pathname
  useEffect(() => {
    if (pathname.includes('/students')) {
      setCurrentPage('students');
    } else if (pathname.includes('/progress')) {
      setCurrentPage('progress');
    } else if (pathname.includes('/dashboard')) {
      setCurrentPage('dashboard');
    } else if (pathname.includes('/map')) {
      setCurrentPage('map');
    } else {
      setCurrentPage(null);
    }
  }, [pathname, setCurrentPage]);

  // Sync local query with global query
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(localQuery);
      
      // Update the appropriate store based on current page
      if (currentPage === 'students') {
        setStudentSearchQuery(localQuery);
      } else if (currentPage === 'progress') {
        setProgressSearchQuery(localQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, currentPage, setQuery, setStudentSearchQuery, setProgressSearchQuery]);

  // Only show search on pages that support it
  if (!currentPage || (currentPage !== 'students' && currentPage !== 'progress')) {
    return null;
  }

  return (
    <div className="relative w-full max-w-full sm:max-w-xs md:max-w-sm lg:max-w-md lg:w-80">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
      <Input
        type="text"
        placeholder={getPlaceholder()}
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        className="pl-10 pr-4 py-2 w-full rounded-full border-2 sm:border-4 border-blue-600 dark:border-blue-500 focus:border-blue-700 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm sm:text-base"
      />
    </div>
  );
}
