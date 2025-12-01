'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export function ActivityTableSkeleton() {
  // Create an array of 3 items to represent loading rows
  const loadingRows = Array.from({ length: 3 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-600 dark:hover:bg-blue-700">
              <TableHead className="text-white font-bold text-center border-r border-blue-500 dark:border-blue-400">
                ACTIVITY NAME
              </TableHead>
              <TableHead className="text-white font-bold text-center border-r border-blue-500 dark:border-blue-400">
                TYPE
              </TableHead>
              <TableHead className="text-white font-bold text-center border-r border-blue-500 dark:border-blue-400">
                SCORE
              </TableHead>
              <TableHead className="text-white font-bold text-center border-r border-blue-500 dark:border-blue-400">
                PERCENTAGE
              </TableHead>
              <TableHead className="text-white font-bold text-center border-r border-blue-500 dark:border-blue-400">
                DATE
              </TableHead>
              <TableHead className="text-white font-bold text-center">
                REMARKS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingRows.map((index) => (
              <TableRow
                key={index}
                className={`${
                  index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-800'
                }`}
              >
                <TableCell className="text-center border-r border-gray-200 dark:border-gray-600">
                  <Skeleton className="h-4 w-32 mx-auto" />
                </TableCell>
                <TableCell className="text-center border-r border-gray-200 dark:border-gray-600">
                  <Skeleton className="h-6 w-16 mx-auto" />
                </TableCell>
                <TableCell className="text-center border-r border-gray-200 dark:border-gray-600">
                  <Skeleton className="h-4 w-12 mx-auto" />
                </TableCell>
                <TableCell className="text-center border-r border-gray-200 dark:border-gray-600">
                  <Skeleton className="h-6 w-12 mx-auto" />
                </TableCell>
                <TableCell className="text-center border-r border-gray-200 dark:border-gray-600">
                  <Skeleton className="h-4 w-20 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-24 mx-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Statistics Skeleton */}
      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mt-4">
        <Skeleton className="h-5 w-32 mb-2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
