'use client';

import { Student, Barangay } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, GraduationCap, Monitor, Hash } from 'lucide-react';
import { formatDate } from '@/utils/date-formatter';
import { formatStudentName } from '@/utils/name-formatter';

interface StudentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  barangays: Barangay[];
}

export function StudentDetailsDialog({
  open,
  onOpenChange,
  student,
  barangays,
}: StudentDetailsDialogProps) {
  if (!student) return null;

  const barangay = barangays.find(b => b._id === student.barangayId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-2 border-blue-200 dark:border-blue-500 bg-white dark:bg-slate-800">
        <DialogHeader className="pb-4 border-b border-blue-100 dark:border-blue-600">
          <DialogTitle className="text-xl font-bold text-blue-800 dark:text-blue-300">Student Details</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Complete information for {student.name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-8">
          {/* Header with LRN and Status */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 border border-blue-200 dark:border-blue-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <Hash className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Learner Reference Number (LRN)</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{student.lrn}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={student.status === 'active' ? 'default' : 'secondary'}
                  className={`text-sm px-3 py-1 ${student.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 border-green-300 dark:border-green-600'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-300 dark:border-red-600'
                  }`}
                >
                  {student.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatStudentName(student.name)}</p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Gender</p>
                  <p className="text-base text-gray-900 dark:text-white capitalize">{student.gender}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Barangay</p>
                  <p className="text-base text-gray-900 dark:text-white">{barangay?.name || 'Unknown'}</p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Enrollment Date</p>
                  <p className="text-base text-gray-900 dark:text-white">{formatDate(student.enrollmentDate)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Complete Address</p>
                <p className="text-base text-gray-900 dark:text-white">{student.address}</p>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div>
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2" />
              Academic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Program</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{student.program}</p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Learning Modality</p>
                <p className="text-base text-gray-900 dark:text-white">{student.modality}</p>
              </div>

              {student.assessment && (
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Assessment</p>
                  <p className="text-base text-gray-900 dark:text-white">{student.assessment}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
