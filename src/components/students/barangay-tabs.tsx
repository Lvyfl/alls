'use client';

import { Barangay } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BarangayTabsProps {
  barangays: Barangay[];
  selectedBarangay: string | null;
  onSelectBarangay: (barangayId: string) => void;
  showAllOption?: boolean;
  allOptionValue?: string;
  allOptionLabel?: string;
}

export function BarangayTabs({
  barangays,
  selectedBarangay,
  onSelectBarangay,
  showAllOption = false,
  allOptionValue = "all",
  allOptionLabel = "All Barangays",
}: BarangayTabsProps) {
  // If no barangays available, don't render anything
  if (barangays.length === 0) {
    return null;
  }

  // Handle "all" option: if selectedBarangay is null and showAllOption is true, use "all"
  const hasSelection = selectedBarangay !== null && selectedBarangay !== undefined;
  const defaultSelection = showAllOption ? allOptionValue : barangays[0]?._id;

  // Use the provided selection when available; otherwise, fall back to defaults
  // If showAllOption is true and no selection, default to "all"
  const currentSelection = hasSelection 
    ? selectedBarangay 
    : (showAllOption ? allOptionValue : defaultSelection);

  return (
    <Tabs
      value={currentSelection}
      onValueChange={onSelectBarangay}
      className="w-full"
    >
      <div className="border-b border-gray-300 dark:border-gray-600">
        {/* Horizontal scroll container for mobile */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
          <TabsList className="w-full !bg-transparent rounded-none gap-0 p-0 justify-start">
            {showAllOption && (
              <TabsTrigger
                value={allOptionValue}
                className={`px-4 sm:px-6 py-3 min-w-[100px] sm:min-w-[120px] border-b-2 transition-colors font-bold whitespace-nowrap text-sm sm:text-base ${
                  currentSelection === allOptionValue
                    ? '!bg-blue-600 dark:!bg-blue-700 !text-white border-blue-600 dark:border-blue-500 rounded-t-lg data-[state=active]:!bg-blue-600 dark:data-[state=active]:!bg-blue-700 data-[state=active]:!text-white'
                    : '!bg-transparent !text-gray-700 dark:!text-gray-300 hover:!text-blue-600 dark:hover:!text-blue-400 border-transparent hover:border-blue-200 dark:hover:border-blue-400 rounded-none data-[state=active]:!bg-transparent'
                }`}
              >
                {allOptionLabel.toUpperCase()}
              </TabsTrigger>
            )}
            {barangays.map((barangay) => (
              <TabsTrigger
                key={barangay._id}
                value={barangay._id}
                className={`px-4 sm:px-6 py-3 min-w-[100px] sm:min-w-[120px] border-b-2 transition-colors font-bold whitespace-nowrap text-sm sm:text-base ${
                  currentSelection === barangay._id
                    ? '!bg-blue-600 dark:!bg-blue-700 !text-white border-blue-600 dark:border-blue-500 rounded-t-lg data-[state=active]:!bg-blue-600 dark:data-[state=active]:!bg-blue-700 data-[state=active]:!text-white'
                    : '!bg-transparent !text-gray-700 dark:!text-gray-300 hover:!text-blue-600 dark:hover:!text-blue-400 border-transparent hover:border-blue-200 dark:hover:border-blue-400 rounded-none data-[state=active]:!bg-transparent'
                }`}
              >
                {barangay.name.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
    </Tabs>
  );
}
