'use client';

import { useState, useEffect } from 'react';
import { PredefinedActivity, ActivityType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Plus, Trash2, X } from 'lucide-react';

interface ManageActivitiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activities: PredefinedActivity[];
  onSave: (activities: PredefinedActivity[]) => Promise<void>;
  moduleTitle: string;
}

export function ManageActivitiesDialog({
  isOpen,
  onClose,
  activities: initialActivities,
  onSave,
  moduleTitle,
}: ManageActivitiesDialogProps) {
  const [activities, setActivities] = useState<PredefinedActivity[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

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

  // Initialize activities when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActivities(
        Array.isArray(initialActivities)
          ? initialActivities.map(activity => ({ ...activity }))
          : []
      );
      setError('');
    }
  }, [isOpen, initialActivities]);

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

  const handleActivityChange = (
    index: number,
    field: keyof PredefinedActivity,
    value: string | number
  ) => {
    const updated = [...activities];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setActivities(updated);
  };

  const validateForm = (): string | null => {
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      if (!activity.name || !activity.name.trim()) {
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

    try {
      await onSave(activities);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save activities');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Activities - {moduleTitle}</DialogTitle>
          <DialogDescription>
            Add, edit, or remove predefined activities for this module.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Predefined Activities</Label>
              <Button
                type="button"
                onClick={handleAddActivity}
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No activities added yet.</p>
                <p className="text-sm mt-2">Click "Add Activity" to create one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Activity {index + 1}
                      </h4>
                      <Button
                        type="button"
                        onClick={() => handleRemoveActivity(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`activity-name-${index}`}>
                          Activity Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`activity-name-${index}`}
                          value={activity.name}
                          onChange={(e) =>
                            handleActivityChange(index, 'name', e.target.value)
                          }
                          placeholder="e.g., Number Recognition (1-100)"
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`activity-type-${index}`}>
                          Type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={activity.type}
                          onValueChange={(value) =>
                            handleActivityChange(index, 'type', value as ActivityType)
                          }
                        >
                          <SelectTrigger id={`activity-type-${index}`} className="mt-1">
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

                      <div>
                        <Label htmlFor={`activity-total-${index}`}>
                          Total Points <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`activity-total-${index}`}
                          type="number"
                          min="1"
                          value={activity.total || ''}
                          onChange={(e) =>
                            handleActivityChange(
                              index,
                              'total',
                              parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="e.g., 25"
                          required
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor={`activity-description-${index}`}>
                          Description (Optional)
                        </Label>
                        <Textarea
                          id={`activity-description-${index}`}
                          value={activity.description || ''}
                          onChange={(e) =>
                            handleActivityChange(index, 'description', e.target.value)
                          }
                          placeholder="Brief description of the activity"
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Activities'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
