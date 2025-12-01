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

export function StudentTableSkeleton() {
  // Create an array of 5 items to represent loading rows
  const loadingRows = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-600">
      <Table>
        <TableHeader className="bg-blue-600 dark:bg-blue-700">
          <TableRow>
            <TableHead className="text-white font-bold">
              LEARNER'S ID NO.
            </TableHead>
            <TableHead className="text-white font-bold">
              NAME
            </TableHead>
            <TableHead className="text-white font-bold">
              STATUS
            </TableHead>
            <TableHead className="text-white font-bold">
              GENDER
            </TableHead>
            <TableHead className="text-white font-bold">
              ADDRESS
            </TableHead>
            <TableHead className="text-white font-bold text-center">
              ACTION
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingRows.map((index) => (
            <TableRow key={index} className="bg-white dark:bg-slate-800">
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-full max-w-[200px]" />
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
