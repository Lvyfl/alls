'use client';

import { useState } from 'react';
import { Student, Barangay } from '@/types';
import { User } from '@/types/auth';
import { StudentFormValues } from '@/validators/student-validators';
import { StudentForm } from './student-form';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  student?: Student;
  barangays: Barangay[];
  user: User | null;
  onSubmit: (data: StudentFormValues) => Promise<void>;
}

export function StudentDialog({
  open,
  onOpenChange,
  title,
  description,
  student,
  barangays,
  user,
  onSubmit,
}: StudentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset error when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      setError(null);
      onOpenChange(open);
    }
  };

  const handleSubmit = async (data: StudentFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(data);
      // Success - close dialog
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting student form:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while saving the student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-2 border-blue-200">
        <DialogHeader className="pb-4 border-b border-blue-100">
          <DialogTitle className="text-xl font-bold text-blue-800">{title}</DialogTitle>
          <DialogDescription className="text-gray-600">{description}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="py-4">
          <StudentForm
            student={student}
            barangays={barangays}
            user={user}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
