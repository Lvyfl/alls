'use client';

import { Tabs, TabsList } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export function BarangayTabsSkeleton() {
  // Create an array of 3 items to represent loading tabs (no "ALL BARANGAYS" tab)
  const loadingTabs = Array.from({ length: 3 }, (_, i) => i);

  return (
    <Tabs className="w-full">
      <div className="border-b border-gray-300 dark:border-gray-600">
        {/* Horizontal scroll container for mobile */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
          <TabsList className="w-full bg-transparent rounded-none gap-0 justify-start">
            <div className="flex">
              {loadingTabs.map((index) => (
                <Skeleton key={index} className="h-12 min-w-[100px] sm:min-w-[120px] px-4 sm:px-6 mx-0.5 rounded-none" />
              ))}
            </div>
          </TabsList>
        </div>
      </div>
    </Tabs>
  );
}
