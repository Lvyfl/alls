'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStudentStore } from '@/store/student-store';
import { useAuthStoreState } from '@/store/auth-store';
import { Student } from '@/types';
import { StudentFormValues } from '@/validators/student-validators';

// Components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BarangayTabs } from '@/components/students/barangay-tabs';
import { BarangayTabsSkeleton } from '@/components/students/barangay-tabs-skeleton';

import { StudentTable } from '@/components/students/student-table';
import { StudentTableSkeleton } from '@/components/students/student-table-skeleton';
import { StudentDialog } from '@/components/students/student-dialog';
import { StudentDetailsDialog } from '@/components/students/student-details-dialog';
import { Plus, Download } from 'lucide-react';
import { exportStudentMasterlist } from '@/utils/excel-export';

export default function StudentsPage() {
  // Get user from auth store
  const { user } = useAuthStoreState();

  // Get student store state and actions
  const {
    students,
    barangays,
    selectedBarangay,
    loadingBarangays,
    setSelectedBarangay,
    addStudent,
    editStudent,
    removeStudent,
    initializeWithUser,
    fetchStudents
  } = useStudentStore();

  // Local state for dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch data on component mount with user context for proper barangay selection
  useEffect(() => {
    initializeWithUser(user);
  }, [initializeWithUser, user]);

  // Refetch students when page becomes visible to ensure data sync between admins
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refetch students to sync with database
        fetchStudents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStudents]);

  // For regular admin, the barangay selection will be automatically handled
  // by the store when barangays are loaded (it will auto-select their assigned barangay)
  // Since filteredBarangays will only contain their assigned barangay, this works correctly

  // Handle add student
  const handleAddStudent = async (data: StudentFormValues): Promise<void> => {
    await addStudent({
      ...data,
      assessment: data.assessment || '',
      image: data.image || '/images/students/default-avatar.png'
    });
  };

  // Handle edit student
  const handleEditStudent = async (data: StudentFormValues): 
  Promise<void> => {
    if (!selectedStudent) {
      throw new Error('No student selected for editing');
    }
    console.log('Editing student:', selectedStudent);
    await editStudent({
      ...data,
      _id: selectedStudent._id,
      assessment: data.assessment || '',
      image: data.image || selectedStudent.image
    });
  };

  // Handle delete student
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await removeStudent(selectedStudent._id);
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error deleting student:', error);
      setDeleteError('Failed to delete student. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  // Open details dialog
  const openDetailsDialog = (student: Student) => {
    setSelectedStudent(student);
    setDetailsDialogOpen(true);
  };

  // Filter barangays based on user role with memoization
  const filteredBarangays = useMemo(() => {
    return user?.role === 'admin' && user?.assignedBarangayId
      ? barangays.filter(b => b._id === user.assignedBarangayId)
      : barangays;
  }, [barangays, user?.role, user?.assignedBarangayId]);

  // Handle Excel export with useCallback
  const handleExportExcel = useCallback(() => {
    try {
      exportStudentMasterlist(students.filteredData, barangays);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  }, [students.filteredData, barangays]);

  return (
    <div className="space-y-6">
      {user?.role === 'master_admin' ? (
        <div className="flex justify-end">
          <Button
            onClick={handleExportExcel}
            className="bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all duration-200 hover:shadow-md"
          >
            <Download className="mr-2 h-4 w-4" /> Export to Excel
          </Button>
        </div>
      ) : null}

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

      {/* Student Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border-4 border-blue-600 dark:border-blue-500">
        <div className="p-1">
          {students.loading ? (
            <StudentTableSkeleton />
          ) : (
            <StudentTable
              students={students.filteredData}
              barangays={barangays}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onView={openDetailsDialog}
            />
          )}
        </div>
      </div>

      {/* Add Student Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-green-600 hover:bg-green-500 cursor-pointer transition-all duration-200 hover:shadow-md"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>

      {/* Add Student Dialog */}
      <StudentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="Add New Student"
        description="Fill in the details to add a new student to the system."
        barangays={filteredBarangays}
        user={user}
        onSubmit={handleAddStudent}
      />

      {/* Edit Student Dialog */}
      {selectedStudent && (
        <StudentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          title="Edit Student"
          description="Update the student's information."
          student={selectedStudent}
          barangays={filteredBarangays}
          user={user}
          onSubmit={handleEditStudent}
        />
      )}

      {/* Student Details Dialog */}
      <StudentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        student={selectedStudent}
        barangays={barangays}
      />

      {/* Delete Confirmation Dialog */}
      {selectedStudent && (
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteError(null);
            setIsDeleting(false);
          }
        }}>
          <DialogContent className="sm:max-w-[480px] border-4 border-red-600 dark:border-red-500 bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-red-700 dark:text-red-300">
                Confirm Student Deletion
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                {`"${selectedStudent.name}" will be permanently removed from the masterlist.`}
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded text-sm">
                {deleteError}
              </div>
            )}

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                Please review the student's information before proceeding. This action cannot be undone.
              </p>
              <div className="p-3 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 flex flex-col gap-1">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedStudent.name}
                </span>
                <span>LRN: {selectedStudent.lrn}</span>
                <span>Program: {selectedStudent.program}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteError(null);
                  setIsDeleting(false);
                }}
                disabled={isDeleting}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteStudent}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 hover:border-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete Student'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
