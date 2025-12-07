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
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Pencil, Archive, Trash2, GraduationCap } from 'lucide-react';
import { formatStudentName } from '@/utils/name-formatter';

interface StudentTableProps {
  students: Student[];
  barangays: Barangay[];
  mode: 'masterlist' | 'archive' | 'graduated';
  onEdit: (student: Student, selectedStudentIds?: string[]) => void;
  onArchive: (student: Student, selectedStudentIds?: string[]) => void;
  onGraduate?: (student: Student, selectedStudentIds?: string[]) => void;
  onView: (student: Student) => void;
  userRole?: string;
}

export const StudentTable = memo(function StudentTable({
  students,
  barangays,
  mode,
  onEdit,
  onArchive,
  onGraduate,
  onView,
  userRole
}: StudentTableProps) {
  // State for sorting
  const [sortField, setSortField] = useState<keyof Student>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // State for selection
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Handle sort
  const handleSort = (field: keyof Student) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle individual student selection
  const handleStudentSelection = (studentId: string, checked: boolean) => {
    const newSelection = new Set(selectedStudents);
    if (checked) {
      newSelection.add(studentId);
    } else {
      newSelection.delete(studentId);
    }
    setSelectedStudents(newSelection);
    setSelectAll(newSelection.size === sortedStudents.length);
  };

  // Handle archive action - smart bulk detection
  const handleArchiveAction = (student?: Student) => {
    if (!student) return;

    // If the clicked student is part of the selection, perform bulk action
    if (selectedStudents.has(student._id)) {
      const selectedStudentArray = sortedStudents.filter(s => selectedStudents.has(s._id));
      if (selectedStudentArray.length > 0) {
        onArchive(selectedStudentArray[0], Array.from(selectedStudents));
      }
    } else {
      // Otherwise perform individual action on the clicked student
      onArchive(student);
    }
  };

  // Handle edit/retrieve action - smart bulk detection
  const handleEditAction = (student?: Student) => {
    if (!student) return;

    if (selectedStudents.has(student._id)) {
      const selectedStudentArray = sortedStudents.filter(s => selectedStudents.has(s._id));
      if (selectedStudentArray.length > 0) {
        onEdit(selectedStudentArray[0], Array.from(selectedStudents));
      }
    } else {
      onEdit(student, undefined);
    }
  };

  // Handle delete action - smart bulk detection
  const handleDeleteAction = (student?: Student) => {
    if (!student) return;

    if (selectedStudents.has(student._id)) {
      const selectedStudentArray = sortedStudents.filter(s => selectedStudents.has(s._id));
      if (selectedStudentArray.length > 0) {
        onArchive(selectedStudentArray[0], Array.from(selectedStudents));
      }
    } else {
      onArchive(student, undefined);
    }
  };

  // Handle graduate action - smart bulk detection
  const handleGraduateAction = (student?: Student) => {
    if (!onGraduate || !student) return;

    if (selectedStudents.has(student._id)) {
      const selectedStudentArray = sortedStudents.filter(s => selectedStudents.has(s._id));
      if (selectedStudentArray.length > 0) {
        onGraduate(selectedStudentArray[0], Array.from(selectedStudents));
      }
    } else {
      onGraduate(student, undefined);
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allStudentIds = new Set(sortedStudents.map(student => student._id));
      setSelectedStudents(allStudentIds);
      setSelectAll(true);
    } else {
      setSelectedStudents(new Set());
      setSelectAll(false);
    }
  };

  const barangayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const barangay of barangays) {
      map.set(barangay._id, barangay.name);
    }
    return map;
  }, [barangays]);

  // Sort students with memoization - group by barangay first, then alphabetical within each barangay
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      // Get barangay names for comparison
      const barangayA = barangayNameMap.get(a.barangayId) || '';
      const barangayB = barangayNameMap.get(b.barangayId) || '';

      // First, sort by barangay name alphabetically
      const barangayComparison = barangayA.localeCompare(barangayB);
      if (barangayComparison !== 0) {
        return barangayComparison;
      }

      // If same barangay, sort by student name alphabetically
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [students, barangayNameMap]);



  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-600 overflow-x-auto">
      <div className="min-w-full inline-block align-middle">
        <Table className="min-w-[800px] table-fixed">
          <TableHeader className="bg-blue-600 dark:bg-blue-700">
            <TableRow>
              <TableHead className="text-white font-bold w-12 text-center">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  className="border-white data-[state=checked]:bg-blue-600"
                />
              </TableHead>
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
                className="text-white font-bold cursor-pointer w-[120px]"
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
                BARANGAY
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
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedStudents.has(student._id)}
                      onCheckedChange={(checked) => handleStudentSelection(student._id, checked as boolean)}
                      className="border-gray-300 dark:border-gray-600"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900 dark:text-white">{student.lrn}</TableCell>
                  <TableCell className="text-gray-900 dark:text-white">{formatStudentName(student.name)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${student.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                      {student.status.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-white">{student.gender ? student.gender.toUpperCase() : 'N/A'}</TableCell>
                  <TableCell className="text-gray-900 dark:text-white">{barangayNameMap.get(student.barangayId) || 'N/A'}</TableCell>
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
                      {mode === 'masterlist' ? (
                        <>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-green-600 text-white hover:bg-green-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(student, undefined);
                            }}
                            title="Edit Student"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-purple-600 text-white hover:bg-purple-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGraduateAction(student);
                            }}
                            title="Done/Graduate Student"
                          >
                            <GraduationCap className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-amber-600 text-white hover:bg-amber-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveAction(student);
                            }}
                            title="Archive / Drop-out Student"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </>
                      ) : mode === 'archive' ? (
                        <>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-green-600 text-white hover:bg-green-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAction(student);
                            }}
                            title="Retrieve Student"
                          >
                            <Archive className="h-4 w-4 rotate-180" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-red-600 text-white hover:bg-red-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAction(student);
                            }}
                            title="Delete Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-green-600 text-white hover:bg-green-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAction(student);
                            }}
                            title="Retrieve Student"
                          >
                            <Archive className="h-4 w-4 rotate-180" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-purple-600 text-white hover:bg-purple-700 border-0 cursor-pointer transition-all duration-200 hover:shadow-md rounded-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAction(student);
                            }}
                            title="Delete Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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
