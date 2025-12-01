'use client';

import { useState } from 'react';
import { Activity } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Edit, Trash2, Plus, FileText } from 'lucide-react';
import { EditActivityModal } from './edit-activity-modal';
import { formatDate } from '@/utils/date-formatter';

interface ActivityTableProps {
  activities: Activity[];
  moduleTitle: string;
  studentId: string;
  moduleId: string;
  onActivityUpdate: (activityIndex: number, activity: Activity) => void;
  onActivityDelete: (activityIndex: number) => void;
  // Student navigation props
  currentStudentIndex?: number;
  totalStudents?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPreviousStudent?: () => void;
  onNextStudent?: () => void;
  isNavigating?: boolean;
  // Predefined activities
  predefinedActivities?: Array<{
    name: string;
    type: string;
    total: number;
    description: string;
  }>;
  // Custom module handler
  onAddCustomModule?: () => void;
}

export function ActivityTable({
  activities,
  moduleTitle,
  studentId,
  moduleId,
  onActivityUpdate,
  onActivityDelete,
  // Student navigation props
  currentStudentIndex,
  totalStudents,
  hasPrevious,
  hasNext,
  onPreviousStudent,
  onNextStudent,
  isNavigating,
  // Predefined activities
  predefinedActivities,
  // Custom module handler
  onAddCustomModule
}: ActivityTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number>(-1);
  const [isNewActivity, setIsNewActivity] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<{
    activity: Activity;
    index: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  // Always show the table structure, even if empty
  const hasActivities = activities.length > 0;

  // Handler functions
  const handleEditActivity = (activity: Activity, index: number) => {
    setSelectedActivity(activity);
    setSelectedActivityIndex(index);
    setIsNewActivity(false);
    setEditModalOpen(true);
  };

  const handleDeleteActivity = (activity: Activity, index: number) => {
    setActivityToDelete({ activity, index });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteActivity = async () => {
    if (!activityToDelete) return;
    try {
      setIsDeleting(true);
      await Promise.resolve(onActivityDelete(activityToDelete.index));
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setActivityToDelete(null);
  };

  const handleSaveActivity = (activity: Activity) => {
    if (isNewActivity) {
      // For new activities, pass -1 as index to indicate it's a new activity
      onActivityUpdate(-1, activity);
    } else {
      onActivityUpdate(selectedActivityIndex, activity);
    }
    setEditModalOpen(false);
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setSelectedActivity(null);
    setSelectedActivityIndex(-1);
    setIsNewActivity(false);
  };

  // Pagination logic
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = activities.slice(startIndex, endIndex);

  // Handler for adding new activity
  const handleAddActivity = () => {
    setSelectedActivity(null);
    setSelectedActivityIndex(-1);
    setIsNewActivity(true);
    setEditModalOpen(true);
  };

  // Handle quick add from predefined activities
  const handleQuickAddFromPredefined = (predefined: {
    name: string;
    type: string;
    total: number;
    description: string;
  }) => {
    const activity: Activity = {
      name: predefined.name,
      type: predefined.type as any,
      score: 0,
      total: predefined.total,
      date: new Date().toISOString().split('T')[0],
      remarks: predefined.description || ''
    };
    // Pass -1 to indicate it's a new activity
    onActivityUpdate(-1, activity);
  };

  return (
    <div className="space-y-4">
      {/* Predefined Activities Section */}
      {predefinedActivities && predefinedActivities.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Available Activities Template for {moduleTitle}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
            {predefinedActivities.map((predefined, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-400 dark:hover:border-blue-500 transition-colors h-full flex flex-col"
              >
                <div className="flex-1 space-y-2">
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      {predefined.name}
                    </h5>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        {predefined.type}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {predefined.total} pts
                      </span>
                    </div>
                    {predefined.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {predefined.description}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                    onClick={() => handleQuickAddFromPredefined(predefined)}
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full bg-green-600 dark:bg-green-700 text-white hover:bg-green-500 dark:hover:bg-green-600 border-green-600 dark:border-green-700 hover:border-green-500 dark:hover:border-green-600 cursor-pointer transition-all duration-200 hover:shadow-md text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Quick Add
                  </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recorded Activities</h3>
        <div className="flex flex-wrap gap-2">
          {onAddCustomModule && (
            <Button
              onClick={onAddCustomModule}
              variant="outline"
              size="sm"
              className="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-500 dark:hover:bg-blue-600 border-blue-600 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-600 cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Custom Module</span>
            </Button>
          )}
          <Button
            onClick={handleAddActivity}
            variant="outline"
            size="sm"
            className="bg-green-600 dark:bg-green-700 text-white hover:bg-green-500 dark:hover:bg-green-600 border-green-600 dark:border-green-700 hover:border-green-500 dark:hover:border-green-600 cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Custom Activity</span>
          </Button>
        </div>
      </div>

      {/* Activity Table - Always show headers */}
      <div className="overflow-x-auto rounded-md border-4 border-blue-600 dark:border-blue-500">
        <div className="min-w-full inline-block align-middle">
          <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-600 dark:hover:bg-blue-700">
              <TableHead className="text-white font-bold text-left border-r-2 border-blue-500 dark:border-blue-400 px-4 py-3">
                Type of Activity
              </TableHead>
              <TableHead className="text-white font-bold text-left border-r-2 border-blue-500 dark:border-blue-400 px-4 py-3">
                Score
              </TableHead>
              <TableHead className="text-white font-bold text-left border-r-2 border-blue-500 dark:border-blue-400 px-4 py-3">
                Total
              </TableHead>
              <TableHead className="text-white font-bold text-left border-r-2 border-blue-500 dark:border-blue-400 px-4 py-3">
                Date Taken
              </TableHead>
              <TableHead className="text-white font-bold text-left border-r-2 border-blue-500 dark:border-blue-400 px-4 py-3">
                Remarks
              </TableHead>
              <TableHead className="text-white font-bold text-left px-4 py-3">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasActivities ? (
              currentActivities.map((activity, index) => {
              const actualIndex = startIndex + index; // Get the actual index in the full activities array
              // Combine type and name into "Type of Activity"
              const typeOfActivity = `${activity.type}: ${activity.name}`;
              return (
                <TableRow
                  key={actualIndex}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800"
                >
                  <TableCell className="font-medium border-r border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                    {typeOfActivity}
                  </TableCell>
                  <TableCell className="border-r border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                    {activity.score}
                  </TableCell>
                  <TableCell className="border-r border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                    {activity.total}
                  </TableCell>
                  <TableCell className="border-r border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                    {formatDate(activity.date)}
                  </TableCell>
                  <TableCell className="border-r border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white">
                    {activity.remarks || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditActivity(activity, actualIndex)}
                        className="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-500 dark:hover:bg-blue-600 border-blue-600 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-600 cursor-pointer transition-all duration-200 hover:shadow-md"
                        title="Edit Activity"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteActivity(activity, actualIndex)}
                        className="bg-red-600 dark:bg-red-700 text-white hover:bg-red-500 dark:hover:bg-red-600 border-red-600 dark:border-red-700 hover:border-red-500 dark:hover:border-red-600 cursor-pointer transition-all duration-200 hover:shadow-md"
                        title="Delete Activity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No activities recorded for {moduleTitle} yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 mt-4">
        <h4 className="font-bold text-gray-900 dark:text-white mb-3">Summary Statistics</h4>
        <div className="text-sm">
          <span className="text-gray-700 dark:text-gray-300">Total Activities: </span>
          <span className="font-medium text-gray-900 dark:text-white">{activities.length}</span>
        </div>
      </div>

      {/* Student Navigation */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          {totalStudents !== undefined && currentStudentIndex !== undefined && currentStudentIndex >= 0 ? (
            <>Student {currentStudentIndex + 1} of {totalStudents}</>
          ) : (
            <>{activities.length} activities</>
          )}
        </div>
        {/* Show student navigation if props are provided, otherwise show activity pagination */}
        {totalStudents !== undefined && onPreviousStudent && onNextStudent ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousStudent}
              disabled={!hasPrevious || isNavigating}
              className="bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-1"
              title="Previous Student"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextStudent}
              disabled={!hasNext || isNavigating}
              className="bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:shadow-md flex items-center gap-1"
              title="Next Student"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-green-600 text-white hover:bg-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:shadow-md"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-green-600 text-white hover:bg-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:shadow-md"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Edit Activity Modal */}
      <EditActivityModal
        isOpen={editModalOpen}
        onClose={handleCloseModal}
        activity={selectedActivity}
        onSave={handleSaveActivity}
        isNew={isNewActivity}
      />

      {/* Delete Confirmation Dialog */}
      {activityToDelete && (
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => (open ? setDeleteDialogOpen(true) : closeDeleteDialog())}>
          <DialogContent className="sm:max-w-[480px] border-4 border-red-600 dark:border-red-500 bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-red-700 dark:text-red-300">
                Confirm Activity Deletion
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                This recorded activity will be permanently removed from the student's progress.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>Please review the activity details before deleting. This action cannot be undone.</p>
              <div className="p-3 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 flex flex-col gap-1">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {activityToDelete.activity.type}: {activityToDelete.activity.name}
                </span>
                <span>Score: {activityToDelete.activity.score} / {activityToDelete.activity.total}</span>
                <span>Date: {formatDate(activityToDelete.activity.date)}</span>
                {activityToDelete.activity.remarks && (
                  <span>Remarks: {activityToDelete.activity.remarks}</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                className="border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteActivity}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 hover:border-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete Activity'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
