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
    archiveStudent,
    retrieveStudent,
    graduateStudent,
    removeStudent,
    initializeWithUser,
    fetchStudents
  } = useStudentStore();

  // Local state for dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [retrieveDialogOpen, setRetrieveDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeFinalDialogOpen, setRemoveFinalDialogOpen] = useState(false);
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] = useState(false);
  const [bulkRetrieveDialogOpen, setBulkRetrieveDialogOpen] = useState(false);

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkGraduateDialogOpen, setBulkGraduateDialogOpen] = useState(false);
  const [graduateDialogOpen, setGraduateDialogOpen] = useState(false);
  const [deleteConfirmationDialogOpen, setDeleteConfirmationDialogOpen] = useState(false);
  const [bulkArchiveStudentIds, setBulkArchiveStudentIds] = useState<string[]>([]);
  const [bulkRetrieveStudentIds, setBulkRetrieveStudentIds] = useState<string[]>([]);
  const [bulkDeleteStudentIds, setBulkDeleteStudentIds] = useState<string[]>([]);
  const [bulkGraduateStudentIds, setBulkGraduateStudentIds] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'masterlist' | 'archive' | 'graduated'>('masterlist');
  const [isRemoving, setIsRemoving] = useState(false);

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

  // Handle edit student in masterlist mode (for individual editing)
  const handleEditStudentAction = (student: Student, selectedStudentIds?: string[]) => {
    if (selectedStudentIds && selectedStudentIds.length > 1) {
      // In masterlist mode, bulk selection should not trigger edit
      // This should not happen, but handle gracefully
      return;
    } else {
      // Individual edit - open edit dialog
      openEditDialog(student);
    }
  };

  // Handle edit student form submission
  const handleEditStudent = async (data: StudentFormValues) => {
    if (!selectedStudent) return;

    setIsArchiving(true);
    setArchiveError(null);
    try {
      console.log('Editing student:', selectedStudent);
      await editStudent({
        ...data,
        _id: selectedStudent._id,
        assessment: data.assessment || '',
        image: data.image || selectedStudent.image
      });
    } catch (error) {
      console.error('Error editing student:', error);
      setArchiveError('Failed to edit student. Please try again.');
    } finally {
      setIsArchiving(false);
    }
  };

  // Handle retrieve student (individual or bulk)
  const handleRetrieveStudent = async (student: Student, selectedStudentIds?: string[]) => {
    if (selectedStudentIds && selectedStudentIds.length > 1) {
      // Bulk retrieve - show custom confirmation dialog
      setBulkRetrieveStudentIds(selectedStudentIds);
      setBulkRetrieveDialogOpen(true);
    } else {
      // Individual retrieve - use existing dialog
      openRetrieveDialog(student);
    }
  };

  // Handle delete student (individual or bulk)
  const handleDeleteStudent = async (student: Student, selectedStudentIds?: string[]) => {
    if (selectedStudentIds && selectedStudentIds.length > 1) {
      // Bulk delete - show first confirmation dialog
      setBulkDeleteStudentIds(selectedStudentIds);
      setDeleteConfirmationDialogOpen(true);
    } else {
      // Individual delete - use existing dialog
      setSelectedStudent(student);
      setRemoveDialogOpen(true);
    }
  };

  // Handle graduate student (individual or bulk)
  const handleGraduateStudent = async (student: Student, selectedStudentIds?: string[]) => {
    if (selectedStudentIds && selectedStudentIds.length > 1) {
      // Bulk graduate - show custom confirmation dialog
      setBulkGraduateStudentIds(selectedStudentIds);
      setBulkGraduateDialogOpen(true);
    } else {
      // Individual graduate - use new dialog
      setSelectedStudent(student);
      setGraduateDialogOpen(true);
    }
  };

  // Handle archive student (individual or bulk)
  const handleArchiveStudent = async (student: Student, selectedStudentIds?: string[]) => {
    if (selectedStudentIds && selectedStudentIds.length > 1) {
      // Bulk archive - show custom confirmation dialog
      setBulkArchiveStudentIds(selectedStudentIds);
      setBulkArchiveDialogOpen(true);
    } else {
      // Individual archive - use existing dialog
      setSelectedStudent(student);
      setArchiveDialogOpen(true);
    }
  };

  // Handle bulk graduate confirmation
  const handleBulkGraduateConfirmation = async () => {
    try {
      for (const studentId of bulkGraduateStudentIds) {
        // Use graduateStudent action instead of manual update
        await graduateStudent(studentId);
      }
      setBulkGraduateDialogOpen(false);
      setBulkGraduateStudentIds([]);
    } catch (error) {
      console.error('Error graduating students:', error);
      alert('Failed to graduate some students. Please try again.');
    }
  };

  // Handle individual graduate confirmation
  const handleGraduateConfirmation = async () => {
    if (!selectedStudent) return;

    setIsArchiving(true);
    try {
      await graduateStudent(selectedStudent._id);
      setGraduateDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error graduating student:', error);
      alert('Failed to graduate student. Please try again.');
    } finally {
      setIsArchiving(false);
    }
  };

  // Handle bulk archive confirmation
  const handleBulkArchiveConfirmation = async () => {
    try {
      for (const studentId of bulkArchiveStudentIds) {
        await archiveStudent(studentId);
      }
      setBulkArchiveDialogOpen(false);
      setBulkArchiveStudentIds([]);
    } catch (error) {
      console.error('Error archiving students:', error);
      alert('Failed to archive some students. Please try again.');
    }
  };

  // Handle individual archive confirmation
  const handleArchiveConfirmation = async () => {
    if (!selectedStudent) return;

    setIsArchiving(true);
    setArchiveError(null);
    try {
      await archiveStudent(selectedStudent._id);
      setArchiveDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error archiving student:', error);
      setArchiveError('Failed to archive student. Please try again.');
    } finally {
      setIsArchiving(false);
    }
  };

  // Handle bulk retrieve confirmation
  const handleBulkRetrieveConfirmation = async () => {
    try {
      for (const studentId of bulkRetrieveStudentIds) {
        await retrieveStudent(studentId);
      }
      setBulkRetrieveDialogOpen(false);
      setBulkRetrieveStudentIds([]);
    } catch (error) {
      console.error('Error retrieving students:', error);
      alert('Failed to retrieve some students. Please try again.');
    }
  };

  // Handle bulk delete confirmation (first dialog)
  const handleBulkDeleteConfirmation = () => {
    setDeleteConfirmationDialogOpen(false);
    setBulkDeleteDialogOpen(true);
  };

  // Handle bulk delete final confirmation (second dialog)
  const handleBulkDeleteFinalConfirmation = async () => {
    try {
      for (const studentId of bulkDeleteStudentIds) {
        await removeStudent(studentId);
      }
      setBulkDeleteDialogOpen(false);
      setBulkDeleteStudentIds([]);
    } catch (error) {
      console.error('Error deleting students:', error);
      alert('Failed to delete some students. Please try again.');
    }
  };

  // Open archive confirmation dialog (for individual actions)
  const openArchiveDialog = (student: Student) => {
    setSelectedStudent(student);
    setArchiveDialogOpen(true);
  };

  // Open retrieve confirmation dialog (for individual actions)
  const openRetrieveDialog = (student: Student) => {
    setSelectedStudent(student);
    setRetrieveDialogOpen(true);
  };

  // Confirm retrieve student from archive (back to masterlist)
  const confirmRetrieveStudent = async () => {
    if (!selectedStudent) return;

    try {
      await retrieveStudent(selectedStudent._id);
      setRetrieveDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error retrieving student:', error);
      alert('Failed to retrieve student. Please try again.');
    }
  };

  // Open first remove confirmation dialog
  const openRemoveDialog = (student: Student) => {
    setSelectedStudent(student);
    setRemoveDialogOpen(true);
  };

  // Proceed to final remove confirmation dialog
  const proceedToFinalRemove = () => {
    setRemoveDialogOpen(false);
    setRemoveFinalDialogOpen(true);
  };

  // Handle permanent remove of student from archive list (final confirmation)
  const confirmRemoveStudent = async () => {
    if (!selectedStudent) return;

    setIsRemoving(true);
    try {
      await removeStudent(selectedStudent._id);
      setRemoveFinalDialogOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Failed to remove student. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setEditDialogOpen(true);
  };

  // Open details dialog
  const openDetailsDialog = (student: Student) => {
    setSelectedStudent(student);
    setDetailsDialogOpen(true);
  };

  // Filter barangays based on user role with memoization and sort alphabetically
  const filteredBarangays = useMemo(() => {
    const filtered = user?.role === 'admin' && user?.assignedBarangayId
      ? barangays.filter(b => b._id === user.assignedBarangayId)
      : barangays;

    // Sort barangays alphabetically
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
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



  // Separate active (masterlist), inactive (archive/drop-out), and graduated students
  const masterlistStudents = useMemo(
    () => students.filteredData.filter(s => s.status === 'active'),
    [students.filteredData]
  );

  const archivedStudents = useMemo(
    () => students.filteredData.filter(s => s.status === 'inactive'),
    [students.filteredData]
  );

  const graduatedStudents = useMemo(
    () => students.filteredData.filter(s => s.status === 'graduated'),
    [students.filteredData]
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {currentMode === 'masterlist' ? (
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={() => setCurrentMode('masterlist')}
            >
              Masterlist
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-blue-600 text-blue-700 dark:text-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={() => setCurrentMode('masterlist')}
            >
              Masterlist
            </Button>
          )}

          {currentMode === 'archive' ? (
            <Button
              variant="default"
              className="bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={() => setCurrentMode('archive')}
            >
              Archive / Drop-out
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-red-600 text-red-700 dark:text-red-300 cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={() => setCurrentMode('archive')}
            >
              Archive / Drop-out
            </Button>
          )}

          {currentMode === 'graduated' ? (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-500 text-white cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={() => setCurrentMode('graduated')}
            >
              Graduated / Done
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-green-600 text-green-700 dark:text-green-300 cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={() => setCurrentMode('graduated')}
            >
              Graduated / Done
            </Button>
          )}
        </div>

        {user?.role === 'master_admin' ? (
          <Button
            onClick={handleExportExcel}
            className="bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all duration-200 hover:shadow-md"
          >
            <Download className="mr-2 h-4 w-4" /> Export to Excel
          </Button>
        ) : null}
      </div>

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
              students={
                currentMode === 'archive' ? archivedStudents :
                  currentMode === 'graduated' ? graduatedStudents :
                    masterlistStudents
              }
              barangays={barangays}
              mode={currentMode}
              onEdit={
                currentMode === 'archive' ? handleRetrieveStudent :
                  currentMode === 'graduated' ? handleRetrieveStudent :
                    handleEditStudentAction
              }
              onArchive={
                currentMode === 'archive' ? handleDeleteStudent :
                  currentMode === 'graduated' ? handleDeleteStudent :
                    handleArchiveStudent
              }
              onGraduate={handleGraduateStudent}
              onView={openDetailsDialog}
              userRole={user?.role}
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

      {/* Archive Confirmation Dialog */}
      {selectedStudent && (
        <Dialog open={archiveDialogOpen} onOpenChange={(open) => {
          setArchiveDialogOpen(open);
          if (!open) {
            setArchiveError(null);
            setIsArchiving(false);
          }
        }}>
          <DialogContent className="sm:max-w-[480px] border-4 border-amber-600 dark:border-amber-500 bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-amber-700 dark:text-amber-300">
                Confirm Student Archive
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                {`"${selectedStudent.name}" will be moved to the Archive/Drop-out list and removed from the masterlist.`}
              </DialogDescription>
            </DialogHeader>

            {archiveError && (
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300 rounded text-sm">
                {archiveError}
              </div>
            )}

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                Please review the student's information before proceeding. You can still view archived students in the Archive/Drop-out list.
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
                  setArchiveDialogOpen(false);
                  setArchiveError(null);
                  setIsArchiving(false);
                }}
                disabled={isArchiving}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleArchiveConfirmation}
                disabled={isArchiving}
                className="bg-amber-600 hover:bg-amber-700 text-white border-2 border-amber-500 hover:border-amber-600"
              >
                {isArchiving ? 'Archiving...' : 'Archive Student'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Graduate Confirmation Dialog */}
      {selectedStudent && (
        <Dialog open={graduateDialogOpen} onOpenChange={(open) => {
          setGraduateDialogOpen(open);
          if (!open) {
            setIsArchiving(false);
          }
        }}>
          <DialogContent className="sm:max-w-[480px] border-4 border-purple-600 dark:border-purple-500 bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-purple-700 dark:text-purple-300">
                Confirm Student Graduation
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                {`"${selectedStudent.name}" will be marked as Graduated and moved to the Graduated/Done list.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                This action signifies that the student has completed the program.
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
                  setGraduateDialogOpen(false);
                  setIsArchiving(false);
                }}
                disabled={isArchiving}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleGraduateConfirmation}
                disabled={isArchiving}
                className="bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-600 hover:border-purple-700"
              >
                {isArchiving ? 'Processing...' : 'Graduate Student'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Retrieve Confirmation Dialog */}
      {selectedStudent && (
        <Dialog open={retrieveDialogOpen} onOpenChange={(open) => {
          setRetrieveDialogOpen(open);
          if (!open) {
            setSelectedStudent(null);
          }
        }}>
          <DialogContent className="sm:max-w-[480px] border-4 border-green-600 dark:border-green-500 bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-green-700 dark:text-green-300">
                Retrieve Student to Masterlist
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                {`"${selectedStudent.name}" will be moved back to the Masterlist and marked as active.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                Are you sure you want to retrieve this student? They will again appear in the active masterlist.
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
                  setRetrieveDialogOpen(false);
                  setSelectedStudent(null);
                }}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmRetrieveStudent}
                className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-600 hover:border-green-700"
              >
                Retrieve Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* First Remove Confirmation Dialog */}
      {selectedStudent && (
        <Dialog open={removeDialogOpen} onOpenChange={(open) => {
          setRemoveDialogOpen(open);
          if (!open) {
            setSelectedStudent(null);
          }
        }}>
          <DialogContent className="sm:max-w-[480px] border-4 border-red-500 dark:border-red-500 bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-red-700 dark:text-red-300">
                Remove Student (Step 1 of 2)
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                {`You are about to permanently remove "${selectedStudent.name}" and all related records.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                This action cannot be undone. If you are absolutely sure, continue to the final confirmation step.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRemoveDialogOpen(false);
                  setSelectedStudent(null);
                }}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={proceedToFinalRemove}
                className="bg-red-500 hover:bg-red-600 text-white border-2 border-red-500 hover:border-red-600"
              >
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Final Remove Confirmation Dialog */}
      {selectedStudent && (
        <Dialog open={removeFinalDialogOpen} onOpenChange={(open) => {
          setRemoveFinalDialogOpen(open);
          if (!open) {
            setIsRemoving(false);
          }
        }}>
          <DialogContent className="sm:max-w-[480px] border-4 border-red-700 dark:border-red-600 bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-red-800 dark:text-red-300">
                Final Confirmation: Permanently Remove Student
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                This is your last chance. This student and all their records will be permanently deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="p-3 rounded border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30 flex flex-col gap-1">
                <span className="font-semibold text-red-800 dark:text-red-200">
                  {selectedStudent?.name}
                </span>
                <span>LRN: {selectedStudent?.lrn}</span>
                <span>Program: {selectedStudent?.program}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRemoveFinalDialogOpen(false);
                  setIsRemoving(false);
                }}
                disabled={isRemoving}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmRemoveStudent}
                disabled={isRemoving}
                className="bg-red-700 hover:bg-red-800 text-white border-2 border-red-700 hover:border-red-800"
              >
                {isRemoving ? 'Removing...' : 'Yes, Remove Permanently'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Archive Confirmation Dialog */}
      {bulkArchiveDialogOpen && (
        <Dialog open={bulkArchiveDialogOpen} onOpenChange={setBulkArchiveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Archive Multiple Students</DialogTitle>
              <DialogDescription>
                Are you sure you want to archive {bulkArchiveStudentIds.length} student{bulkArchiveStudentIds.length !== 1 ? 's' : ''}? They will be moved to the archive and will no longer appear in the active masterlist.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-3 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {bulkArchiveStudentIds.length} student{bulkArchiveStudentIds.length !== 1 ? 's' : ''} selected for archiving
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBulkArchiveDialogOpen(false);
                  setBulkArchiveStudentIds([]);
                }}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkArchiveConfirmation}
                className="bg-amber-600 hover:bg-amber-700 text-white border-2 border-amber-600 hover:border-amber-700"
              >
                Archive {bulkArchiveStudentIds.length} Student{bulkArchiveStudentIds.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Graduate Confirmation Dialog */}
      {bulkGraduateDialogOpen && (
        <Dialog open={bulkGraduateDialogOpen} onOpenChange={setBulkGraduateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-purple-600">Graduate Multiple Students</DialogTitle>
              <DialogDescription>
                Are you sure you want to mark {bulkGraduateStudentIds.length} student{bulkGraduateStudentIds.length !== 1 ? 's' : ''} as graduated/done? They will be moved to the graduated section.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-3 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {bulkGraduateStudentIds.length} student{bulkGraduateStudentIds.length !== 1 ? 's' : ''} selected for graduation
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBulkGraduateDialogOpen(false);
                  setBulkGraduateStudentIds([]);
                }}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkGraduateConfirmation}
                className="bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-600 hover:border-purple-700"
              >
                Graduate {bulkGraduateStudentIds.length} Student{bulkGraduateStudentIds.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Retrieve Confirmation Dialog */}
      {bulkRetrieveDialogOpen && (
        <Dialog open={bulkRetrieveDialogOpen} onOpenChange={setBulkRetrieveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-green-600">Retrieve Multiple Students</DialogTitle>
              <DialogDescription>
                Are you sure you want to retrieve {bulkRetrieveStudentIds.length} student{bulkRetrieveStudentIds.length !== 1 ? 's' : ''}? They will be moved back to the active masterlist.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-3 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {bulkRetrieveStudentIds.length} student{bulkRetrieveStudentIds.length !== 1 ? 's' : ''} selected for retrieval
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBulkRetrieveDialogOpen(false);
                  setBulkRetrieveStudentIds([]);
                }}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkRetrieveConfirmation}
                className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-600 hover:border-green-700"
              >
                Retrieve {bulkRetrieveStudentIds.length} Student{bulkRetrieveStudentIds.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Delete First Confirmation Dialog */}
      {deleteConfirmationDialogOpen && (
        <Dialog open={deleteConfirmationDialogOpen} onOpenChange={setDeleteConfirmationDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Multiple Students</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {bulkDeleteStudentIds.length} student{bulkDeleteStudentIds.length !== 1 ? 's' : ''}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-3 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {bulkDeleteStudentIds.length} student{bulkDeleteStudentIds.length !== 1 ? 's' : ''} selected for permanent deletion
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteConfirmationDialogOpen(false);
                  setBulkDeleteStudentIds([]);
                }}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkDeleteConfirmation}
                className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 hover:border-red-700"
              >
                Yes, Delete {bulkDeleteStudentIds.length} Student{bulkDeleteStudentIds.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Delete Final Confirmation Dialog */}
      {bulkDeleteDialogOpen && (
        <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-700">Final Confirmation</DialogTitle>
              <DialogDescription>
                This is your final chance to cancel. Deleting {bulkDeleteStudentIds.length} student{bulkDeleteStudentIds.length !== 1 ? 's' : ''} will permanently remove all their data from the system.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-3 rounded border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/20">
                <span className="font-semibold text-red-700 dark:text-red-300">
                  WARNING: This action cannot be undone!
                </span>
                <p className="text-red-600 dark:text-red-400 mt-1">
                  {bulkDeleteStudentIds.length} student{bulkDeleteStudentIds.length !== 1 ? 's' : ''} will be permanently deleted
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBulkDeleteDialogOpen(false);
                  setBulkDeleteStudentIds([]);
                }}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkDeleteFinalConfirmation}
                className="bg-red-700 hover:bg-red-800 text-white border-2 border-red-700 hover:border-red-800"
              >
                Yes, Delete Permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
