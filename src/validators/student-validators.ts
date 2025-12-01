import { z } from 'zod';
import { Gender, Program, Modality, Status } from '@/types';

// Student form schema
export const studentSchema = z.object({
  lrn: z.string()
    .min(12, { message: "LRN must be exactly 12 characters" })
    .max(12, { message: "LRN must be exactly 12 characters" })
    .regex(/^\d{12}$/, { message: "LRN must contain exactly 12 digits (0-9)" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  status: z.enum(['active', 'inactive'] as const),
  gender: z.enum(['male', 'female'] as const),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  barangayId: z.string().min(1, { message: "Barangay is required" }),
  program: z.string().min(1, { message: "Program is required" }),
  enrollmentDate: z.string().min(1, { message: "Enrollment date is required" }),
  modality: z.enum(['Face to Face', 'Online', 'Blended'] as const),
  pisScore: z.number().min(0).max(100).nullable(),
  assessment: z.string().optional(),
  group: z.string().min(1, { message: "Group is required" }),
  image: z.string().optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
});

// Type for the form values
export type StudentFormValues = z.infer<typeof studentSchema>;

// Program options
export const programOptions = [
  { value: 'Basic Literacy (BLP)', label: 'Basic Literacy (BLP)' },
  { value: 'A&E Elementary', label: 'A&E Elementary' },
  { value: 'A&E Secondary', label: 'A&E Secondary' },
];

// Modality options
export const modalityOptions = [
  { value: 'Face to Face', label: 'Face to Face' },
  { value: 'Online', label: 'Online' },
  { value: 'Blended', label: 'Blended' },
];

// Status options
export const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Gender options
export const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

// Group options
export const groupOptions = [
  { value: 'A', label: 'Group A' },
  { value: 'B', label: 'Group B' },
  { value: 'C', label: 'Group C' },
  { value: 'D', label: 'Group D' },
  { value: 'E', label: 'Group E' },
];
