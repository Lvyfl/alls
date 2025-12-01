'use client';

import { useState, useEffect } from 'react';
import { Module, Student } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { fetchModules } from '@/services/api';
import { useAuthStoreState } from '@/store/auth-store';

interface AddModuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onAddModule: (moduleId: string) => Promise<void>;
}

export function AddModuleDialog({
  isOpen,
  onClose,
  student,
  onAddModule
}: AddModuleDialogProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const { user } = useAuthStoreState();

  // Fetch available modules for the student's program and barangay
  useEffect(() => {
    if (isOpen && student) {
      const loadModules = async () => {
        setLoading(true);
        try {
          // Determine which barangayId to use for filtering:
          // 1. Student's barangay (primary)
          // 2. Admin's assigned barangay (fallback)
          const barangayIdForFilter = student.barangayId || (user?.role === 'admin' ? user.assignedBarangayId : undefined);

          // Fetch modules filtered by barangay (backend enforces admin scoping)
          const allModules = await fetchModules(barangayIdForFilter);

          // Filter modules by student's program
          const filteredModules = allModules.filter(
            (module) =>
              // Filter by program
              (module.levels?.includes(student.program) ||
              module.levels?.includes("All Programs"))
          );
          setModules(filteredModules);
        } catch (error) {
          console.error("Error loading modules:", error);
          setError("Failed to load modules");
        } finally {
          setLoading(false);
        }
      };
      loadModules();
    }
  }, [isOpen, student]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedModuleId('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedModuleId) {
      setError("Please select a module");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onAddModule(selectedModuleId);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add module");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-4 border-blue-600">
        <DialogHeader className="bg-blue-600 text-white p-4 -m-6 mb-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              Add Module for {student?.name || 'Student'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-blue-700 p-1 cursor-pointer transition-all duration-200"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="module" className="text-sm font-medium">
              Select Module *
            </Label>
            {loading ? (
              <div className="text-gray-500 text-sm">Loading modules...</div>
            ) : (
              <Select
                value={selectedModuleId}
                onValueChange={(value) => {
                  setSelectedModuleId(value);
                  setError('');
                }}
              >
                <SelectTrigger className={`border-2 ${error ? 'border-red-500' : 'border-gray-300'}`}>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module._id || module._id} value={module._id || module._id}>
                      {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {modules.length === 0 && !loading && (
              <p className="text-sm text-gray-500">
                No modules available for {student?.program || 'this program'}
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-2 border-gray-300 cursor-pointer transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedModuleId || loading}
              className="bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

