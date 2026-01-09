'use client';

import { useState, useEffect } from 'react';
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
import { Barangay } from '@/types';
import { deleteBarangay } from '@/services/api';
import { AlertTriangle } from 'lucide-react';

interface DeleteBarangayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barangay: Barangay | null;
  onSuccess: () => void;
}

export function DeleteBarangayDialog({
  open,
  onOpenChange,
  barangay,
  onSuccess,
}: DeleteBarangayDialogProps) {
  const [step, setStep] = useState<'credentials' | 'confirmation'>('credentials');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmationText, setConfirmationText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear fields when dialog opens
  useEffect(() => {
    if (open) {
      setStep('credentials');
      setEmail('');
      setPassword('');
      setConfirmationText('');
      setError(null);
    }
  }, [open]);

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting && !isVerifying) {
      setError(null);
      setStep('credentials');
      setEmail('');
      setPassword('');
      setConfirmationText('');
      onOpenChange(open);
    }
  };

  const handleVerifyCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    if (!barangay) {
      setError('No barangay selected for deletion');
      setIsVerifying(false);
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      setIsVerifying(false);
      return;
    }

    if (!password) {
      setError('Password is required');
      setIsVerifying(false);
      return;
    }

    // Verify credentials by attempting to authenticate
    // We'll verify by calling a simple auth check or proceed to confirmation
    // For now, we'll just move to the confirmation step
    // In a real scenario, you might want to verify credentials first
    try {
      // Move to confirmation step
      setStep('confirmation');
      setError(null);
    } catch (err) {
      console.error('Error verifying credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify credentials');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinalDelete = async () => {
    if (!barangay) {
      setError('No barangay selected for deletion');
      return;
    }

    // Verify confirmation text matches barangay name
    if (confirmationText.trim().toLowerCase() !== barangay.name.toLowerCase()) {
      setError(`Please type "${barangay.name}" exactly to confirm deletion`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await deleteBarangay(barangay._id, email.trim(), password);

    if (!result.success) {
      setError(result.error || 'Failed to delete barangay');
      setIsSubmitting(false);
      return;
    }

    // Reset form and close dialog
    setStep('credentials');
    setEmail('');
    setPassword('');
    setConfirmationText('');
    setError(null);
    setIsSubmitting(false);
    onOpenChange(false);
    onSuccess();
  };

  const handleBack = () => {
    setStep('credentials');
    setConfirmationText('');
    setError(null);
  };

  if (!barangay) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete Barangay {step === 'confirmation' && '- Final Confirmation'}
          </DialogTitle>
          <DialogDescription>
            {step === 'credentials' 
              ? 'This action cannot be undone. Please verify your identity to proceed with deletion.'
              : 'This is your final chance to cancel. Please confirm the deletion by typing the barangay name.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'credentials' ? (
          <form onSubmit={handleVerifyCredentials} className="space-y-4">
            {/* Barangay Info */}
            <div className="p-4 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="space-y-1">
                <p className="font-semibold text-red-900 dark:text-red-200">
                  {barangay.name}
                </p>
                {barangay.address && (
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {barangay.address}
                  </p>
                )}
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                ⚠️ Warning: This will permanently delete this barangay from the system.
              </p>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="delete-email">Your Email</Label>
              <Input
                id="delete-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={isVerifying}
                required
                autoComplete="off"
                data-form-type="other"
              />
              <p className="text-xs text-gray-500">
                Enter the email address associated with your admin account
              </p>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="delete-password">Your Password</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isVerifying}
                required
                autoComplete="new-password"
                data-form-type="other"
              />
              <p className="text-xs text-gray-500">
                Enter your password to confirm this action
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isVerifying || !email.trim() || !password}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isVerifying ? 'Verifying...' : 'Continue'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Final Confirmation Step */}
            <div className="p-4 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="space-y-1">
                <p className="font-semibold text-red-900 dark:text-red-200">
                  {barangay.name}
                </p>
                {barangay.address && (
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {barangay.address}
                  </p>
                )}
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                ⚠️ WARNING: This action cannot be undone!
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation-text">
                Type <span className="font-bold select-all">{barangay.name}</span> to confirm deletion:
              </Label>
              <Input
                id="confirmation-text"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={barangay.name}
                disabled={isSubmitting}
                autoComplete="off"
                data-form-type="other"
                className="border-2 border-red-300 dark:border-red-700/50 focus:border-red-600 dark:focus:border-red-500"
              />
              <p className="text-xs text-gray-500">
                You must type the exact barangay name to proceed with deletion
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleFinalDelete}
                disabled={isSubmitting || confirmationText.trim().toLowerCase() !== barangay.name.toLowerCase()}
                className="bg-red-700 hover:bg-red-800 text-white border-2 border-red-700 hover:border-red-800"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
