import { z } from 'zod';
import { UserRole } from '@/types/auth';
import { authService } from '@/services/auth-service';

// Login form validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(0)
    .refine(
      (value) => value.length === 0 || value.length >= 8,
      { message: 'Password must be at least 8 characters' }
    ),
  rememberMe: z.boolean().optional().default(false),
});

// Registration form validation schema
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, { message: 'First name is required' })
      .max(50, { message: 'First name must be less than 50 characters' }),
    middleName: z
      .string()
      .max(50, { message: 'Middle name must be less than 50 characters' })
      .optional(),
    lastName: z
      .string()
      .min(1, { message: 'Last name is required' })
      .max(50, { message: 'Last name must be less than 50 characters' }),
    email: z
      .string()
      .min(1, { message: 'Email is required' })
      .email({ message: 'Invalid email address' })
      .refine(async (email) => {
        try {
          const users = await authService.getStoredUsers();
          return !users.some((u) => u.email === email);
        } catch {
          return true; // If error checking, allow validation to pass
        }
      }, { message: 'Email already taken!' }),
    gender: z
      .string()
      .min(1, { message: 'Gender is required' })
      .optional(),
    birthday: z
      .string()
      .min(1, { message: 'Birthday is required' })
      .refine((dateString) => {
        const birthDate = new Date(dateString);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        // Check if age is at least 18
        if (age < 18) {
          return false;
        }

        // If exactly 18, check if birthday has passed this year
        if (age === 18) {
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return false;
          }
        }

        return true;
      }, { message: 'Only 18+ years old can have an account!' })
      .optional(),
    role: z
      .enum(['admin', 'teacher'] as [UserRole, ...UserRole[]])
      .default('teacher'),
    assignedBarangayId: z
      .string()
      .optional(),
    password: z
      .string()
      .min(1, { message: 'Password is required' })
      .min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z
      .string()
      .min(1, { message: 'Please confirm your password' }),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must accept the terms and conditions',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => {
    // If role is teacher, assignedBarangayId is required
    if (data.role === 'teacher') {
      return !!data.assignedBarangayId;
    }
    return true;
  }, {
    message: 'Barangay assignment is required for teachers',
    path: ['assignedBarangayId'],
  });

// Types derived from the schemas
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
