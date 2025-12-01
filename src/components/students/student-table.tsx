'use client';

import { useState, useMemo, memo } from 'react';
import { Student, Barangay } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatStudentName } from '@/utils/name-formatter';

interface StudentTableProps {
  students: Student[];
  barangays: Barangay[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onView: (student: Student) => void;
}

export const StudentTable = memo(function StudentTable({
  students,
  barangays,
  onEdit,
  onDelete,
  onView
}: StudentTableProps) {
  // State for sorting
  const [sortField, setSortField] = useState<keyof Student>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Handle sort
  const handleSort = (field: keyof Student) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort students with memoization
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue === null) return sortDirection === 'asc' ? -1 : 1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });
  }, [students, sortField, sortDirection]);

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-600 overflow-x-auto">
      <div className="min-w-full inline-block align-middle">
        <Table className="min-w-[800px]">
        <TableHeader className="bg-blue-600 dark:bg-blue-700">
          <TableRow>
            <TableHead
              className="text-white font-bold cursor-pointer"
              onClick={() => handleSort('lrn')}
            >
              LRN
              {sortField === 'lrn' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead className="text-white font-bold">
              NAME
            </TableHead>
            <TableHead
              className="text-white font-bold cursor-pointer"
              onClick={() => handleSort('status')}
            >
              STATUS
              {sortField === 'status' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead
              className="text-white font-bold cursor-pointer"
              onClick={() => handleSort('gender')}
            >
              GENDER
              {sortField === 'gender' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead
              className="text-white font-bold cursor-pointer"
              onClick={() => handleSort('address')}
            >
              ADDRESS
              {sortField === 'address' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead className="text-white font-bold text-center">
              ACTION
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStudents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                No students found
              </TableCell>
            </TableRow>
          ) : (
            sortedStudents.map((student) => (
              <TableRow
                key={student._id}
                className="bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <TableCell className="font-medium text-gray-900 dark:text-white">{student.lrn}</TableCell>
                <TableCell className="text-gray-900 dark:text-white">{formatStudentName(student.name)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    student.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {student.status.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="text-gray-900 dark:text-white">{student.gender.toUpperCase()}</TableCell>
                <TableCell className="text-gray-900 dark:text-white">{student.address}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center space-x-2">
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(student);
                      }}
                      title="View Student"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-green-600 text-white hover:bg-green-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(student);
                      }}
                      title="Edit Student"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-red-600 text-white hover:bg-red-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(student);
                      }}
                      title="Delete Student"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
});
