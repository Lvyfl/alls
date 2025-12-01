'use client';

import { useState, useEffect } from 'react';
import { Activity } from '@/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onSave: (activity: Activity) => void;
  isNew?: boolean;
}

export function EditActivityModal({
  isOpen,
  onClose,
  activity,
  onSave,
  isNew = false
}: EditActivityModalProps) {
  const [formData, setFormData] = useState<Activity>({
    name: '',
    type: 'Assessment',
    score: 0,
    total: 0,
    date: '',
    remarks: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or activity changes
  useEffect(() => {
    if (isOpen && activity && !isNew) {
      // Editing existing activity - populate with activity data
      setFormData({ ...activity });
      setErrors({});
    } else if (isOpen && isNew) {
      // Creating new activity - use default values
      setFormData({
        name: '',
        type: 'Assessment',
        score: 0,
        total: 0,
        date: new Date().toISOString().split('T')[0], // Today's date
        remarks: ''
      });
      setErrors({});
    } else if (!isOpen) {
      // Modal is closing - reset form
      setFormData({
        name: '',
        type: 'Assessment',
        score: 0,
        total: 0,
        date: '',
        remarks: ''
      });
      setErrors({});
    }
  }, [isOpen, activity, isNew]);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Activity name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Activity type is required';
    }

    if (formData.score < 0) {
      newErrors.score = 'Score cannot be negative';
    }

    if (formData.total <= 0) {
      newErrors.total = 'Total must be greater than 0';
    }

    if (formData.score > formData.total) {
      newErrors.score = 'Score cannot be greater than total';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (selectedDate > today) {
        newErrors.date = 'Date cannot be in the future';
      }
    }

    if (!formData.remarks.trim()) {
      newErrors.remarks = 'Remarks are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof Activity, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-4 border-blue-600">
        <DialogHeader className="bg-blue-600 text-white p-4 -m-6 mb-4 rounded-t-lg">
          <DialogTitle className="text-lg font-bold">
            {isNew ? 'Add New Activity' : 'Edit Activity'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Activity Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter activity name"
              className={`border-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name}</p>
            )}
          </div>

          {/* Activity Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Type *
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger className={`border-2 ${errors.type ? 'border-red-500' : 'border-gray-300'}`}>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Assessment">Assessment</SelectItem>
                <SelectItem value="Quiz">Quiz</SelectItem>
                <SelectItem value="Assignment">Assignment</SelectItem>
                <SelectItem value="Project">Project</SelectItem>
                <SelectItem value="Participation">Participation</SelectItem>
                <SelectItem value="Activity">Activity</SelectItem>
                <SelectItem value="Examination">Examination</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-red-500 text-xs">{errors.type}</p>
            )}
          </div>

          {/* Score and Total */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score" className="text-sm font-medium">
                Score *
              </Label>
              <Input
                id="score"
                type="number"
                min="0"
                value={formData.score}
                onChange={(e) => handleInputChange('score', parseInt(e.target.value) || 0)}
                className={`border-2 ${errors.score ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.score && (
                <p className="text-red-500 text-xs">{errors.score}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total" className="text-sm font-medium">
                Total *
              </Label>
              <Input
                id="total"
                type="number"
                min="1"
                value={formData.total}
                onChange={(e) => handleInputChange('total', parseInt(e.target.value) || 0)}
                className={`border-2 ${errors.total ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.total && (
                <p className="text-red-500 text-xs">{errors.total}</p>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Date *
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={`border-2 ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.date && (
              <p className="text-red-500 text-xs">{errors.date}</p>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks *
            </Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Enter remarks about the activity"
              rows={3}
              className={`border-2 ${errors.remarks ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.remarks && (
              <p className="text-red-500 text-xs">{errors.remarks}</p>
            )}
          </div>

          {/* Form Actions */}
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
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : (isNew ? 'Add Activity' : 'Save Changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
