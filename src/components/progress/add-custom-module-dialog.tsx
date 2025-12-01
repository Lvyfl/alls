'use client';

import { useState, useEffect } from 'react';
import { Student, PredefinedActivity, ActivityType, Module } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus, Trash2 } from 'lucide-react';

interface ModuleFormValues {
  title: string;
  levels: string[];
  predefinedActivities: PredefinedActivity[];
}

interface AddCustomModuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  mode?: 'create' | 'edit';
  moduleToEdit?: Module | null;
  onAddModule?: (moduleData: ModuleFormValues) => Promise<void>;
  onUpdateModule?: (moduleId: string, moduleData: ModuleFormValues) => Promise<void>;
}

export function AddCustomModuleDialog({
  isOpen,
  onClose,
  student,
  mode = 'create',
  moduleToEdit,
  onAddModule,
  onUpdateModule
}: AddCustomModuleDialogProps) {
  const [moduleTitle, setModuleTitle] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [activities, setActivities] = useState<PredefinedActivity[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const isEditMode = mode === 'edit' && !!moduleToEdit;

  // Available program levels
  const programLevels = [
    'Basic Literacy (BLP)',
    'A&E Elementary',
    'A&E Secondary',
    'All Programs'
  ];

  // Activity types
  const activityTypes: ActivityType[] = [
    'Quiz',
    'Assignment',
    'Activity',
    'Project',
    'Participation',
    'Assessment',
    'Examination'
  ];

  // Reset or prefill form depending on context
  useEffect(() => {
    if (!isOpen) {
      setModuleTitle('');
      setSelectedLevels([]);
      setActivities([]);
      setError('');
      return;
    }

    if (isEditMode && moduleToEdit) {
      setModuleTitle(moduleToEdit.title || '');
      setSelectedLevels(
        Array.isArray(moduleToEdit.levels) ? [...moduleToEdit.levels] : []
      );
      setActivities(
        Array.isArray(moduleToEdit.predefinedActivities)
          ? moduleToEdit.predefinedActivities.map(activity => ({ ...activity }))
          : []
      );
      setError('');
      return;
    }

    setModuleTitle('');
    setActivities([]);
    if (student?.program) {
      setSelectedLevels([student.program]);
    } else {
      setSelectedLevels([]);
    }
    setError('');
  }, [isOpen, student, isEditMode, moduleToEdit]);

  const handleAddActivity = () => {
    setActivities([
      ...activities,
      {
        name: '',
        type: 'Assessment',
        total: 0,
        description: ''
      }
    ]);
  };

  const handleRemoveActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const handleActivityChange = (index: number, field: keyof PredefinedActivity, value: string | number) => {
    const updated = [...activities];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setActivities(updated);
  };

  const handleLevelToggle = (level: string) => {
    setSelectedLevels(prev => {
      if (prev.includes(level)) {
        return prev.filter(l => l !== level);
      } else {
        return [...prev, level];
      }
    });
  };

  const validateForm = (): string | null => {
    if (!moduleTitle.trim()) {
      return 'Module name is required';
    }
    if (selectedLevels.length === 0) {
      return 'At least one program level must be selected';
    }
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      if (!activity.name.trim()) {
        return `Activity ${i + 1}: Name is required`;
      }
      if (!activity.type) {
        return `Activity ${i + 1}: Type is required`;
      }
      if (!activity.total || activity.total <= 0) {
        return `Activity ${i + 1}: Total points must be greater than 0`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload: ModuleFormValues = {
      title: moduleTitle.trim(),
      levels: selectedLevels,
      predefinedActivities: activities
    };

    try {
      if (isEditMode) {
        if (!moduleToEdit?._id) {
          throw new Error('Selected module is missing its identifier.');
        }
        if (!onUpdateModule) {
          throw new Error('Module editing is unavailable at the moment.');
        }
        await onUpdateModule(moduleToEdit._id, payload);
      } else {
        if (!onAddModule) {
          throw new Error('Module creation is unavailable at the moment.');
        }
        await onAddModule(payload);
      }
      onClose();
    } catch (error) {
      const actionLabel = isEditMode ? 'update' : 'create';
      setError(error instanceof Error ? error.message : `Failed to ${actionLabel} module`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-4 border-blue-600">
        <DialogHeader className="bg-blue-600 text-white p-4 -m-6 mb-4 rounded-t-lg sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              {isEditMode ? 'Edit Module' : 'Add Custom Module'}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Module Name */}
          <div className="space-y-2">
            <Label htmlFor="moduleTitle" className="text-sm font-medium text-gray-900 dark:text-white">
              Module Name *
            </Label>
            <Input
              id="moduleTitle"
              value={moduleTitle}
              onChange={(e) => {
                setModuleTitle(e.target.value);
                setError('');
              }}
              placeholder="Enter module name"
              className="border-2 border-gray-300 dark:border-gray-600"
              disabled={isSubmitting}
            />
          </div>

          {/* Program Levels */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">
              Available For Programs *
            </Label>
            <div className="flex flex-wrap gap-2">
              {programLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleLevelToggle(level)}
                  disabled={isSubmitting}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    selectedLevels.includes(level)
                      ? 'bg-blue-600 text-white border-2 border-blue-600'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            {selectedLevels.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select at least one program level
              </p>
            )}
          </div>

          {/* Activities Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                Available Activities
              </Label>
              <Button
                type="button"
                onClick={handleAddActivity}
                size="sm"
                variant="outline"
                className="bg-green-600 dark:bg-green-700 text-white hover:bg-green-500 dark:hover:bg-green-600 border-green-600 dark:border-green-700"
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Activity
              </Button>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No activities added yet. Click "Add Activity" to add activities for this module.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Activity {index + 1}
                      </h4>
                      <Button
                        type="button"
                        onClick={() => handleRemoveActivity(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Activity Name */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Activity Name *
                        </Label>
                        <Input
                          value={activity.name}
                          onChange={(e) => handleActivityChange(index, 'name', e.target.value)}
                          placeholder="Enter activity name"
                          className="border-2 border-gray-300 dark:border-gray-600 text-sm"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Activity Type */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Activity Type *
                        </Label>
                        <Select
                          value={activity.type}
                          onValueChange={(value) => handleActivityChange(index, 'type', value as ActivityType)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="border-2 border-gray-300 dark:border-gray-600 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activityTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Total Points */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Total Points *
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={activity.total || ''}
                          onChange={(e) => handleActivityChange(index, 'total', parseInt(e.target.value) || 0)}
                          placeholder="Enter total points"
                          className="border-2 border-gray-300 dark:border-gray-600 text-sm"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Description
                        </Label>
                        <Textarea
                          value={activity.description}
                          onChange={(e) => handleActivityChange(index, 'description', e.target.value)}
                          placeholder="Enter activity description (optional)"
                          className="border-2 border-gray-300 dark:border-gray-600 text-sm min-h-[60px]"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4 sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-2 border-gray-300 dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSubmitting
                ? (isEditMode ? 'Saving...' : 'Creating...')
                : (isEditMode ? 'Save Changes' : 'Create Module')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

