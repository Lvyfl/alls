// Common Types
export type Status = 'active' | 'inactive';
export type Gender = 'male' | 'female';
export type Program = 'Basic Literacy (BLP)' | 'A&E Elementary' | 'A&E Secondary';
export type Modality = 'Face to Face' | 'Online' | 'Blended';
export type ActivityType =
  | 'Quiz'
  | 'Assignment'
  | 'Activity'
  | 'Project'
  | 'Participation'
  | 'Assessment'
  | 'Examination';
export type EventType = 'orientation' | 'assessment' | 'workshop' | 'lesson';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

// Barangay Interface
export interface Barangay {
  _id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

// Event Interface
export interface Event {
  _id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time range (e.g., "8:00 AM - 12:00 PM")
  type: EventType;
  description: string;
  location: string;
  status: EventStatus;
}

// Student Interface
export interface Student {
  _id: string;
  lrn: string; // Learner Reference Number
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  status: Status;
  gender: Gender;
  address: string;
  barangayId: string;
  program: Program | string;
  enrollmentDate: string;
  modality: Modality;
  pisScore: number | null;
  assessment: string;
  group: string; // Group assignment (A, B, C, etc.)
  image: string; // Profile image path
}

// Predefined Activity Interface
export interface PredefinedActivity {
  name: string;
  type: ActivityType;
  total: number;
  description: string;
}

// Module Interface
export interface Module {
  _id: string;
  title: string;
  levels: string[];
  predefinedActivities?: PredefinedActivity[];
  barangayId?: string; // Optional: if not set, module is available to all barangays (for backward compatibility)
}

// Activity Interface
export interface Activity {
  name: string;
  type: ActivityType;
  score: number;
  total: number;
  date: string;
  remarks: string;
}

// Progress Interface
export interface Progress {
  _id: string;
  studentId: string;
  barangayId: string;
  moduleId: string;
  activities: Activity[];
}

// Filter Types
export interface StudentFilters {
  name?: string;
  status?: Status;
  barangayId?: string;
  program?: string;
  gender?: Gender;
}

export interface ProgressFilters {
  studentId?: string;
  barangayId?: string;
  moduleId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface EventFilters {
  type?: EventType;
  status?: EventStatus;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
}

// Statistics Types
export interface StudentStatistics {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  maleCount: number;
  femaleCount: number;
  programDistribution: Record<string, number>;
  barangayDistribution: Record<string, number>;
}

export interface ProgressStatistics {
  averageScore: number;
  completionRate: number;
  moduleDistribution: Record<string, number>;
  activityTypeDistribution: Record<ActivityType, number>;
}

export interface EventStatistics {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  typeDistribution: Record<EventType, number>;
  locationDistribution: Record<string, number>;
}

// Store State Types
export interface StoreState {
  students: StudentState;
  barangays: BarangayState;
  modules: ModuleState;
  progress: ProgressState;
  events: EventState;
}

export interface StudentState {
  data: Student[];
  filteredData: Student[];
  filters: StudentFilters;
  statistics: StudentStatistics;
  loading: boolean;
  error: string | null;
}

export interface BarangayState {
  data: Barangay[];
  loading: boolean;
  error: string | null;
}

export interface ModuleState {
  data: Module[];
  loading: boolean;
  error: string | null;
}

export interface ProgressState {
  data: Progress[];
  filteredData: Progress[];
  filters: ProgressFilters;
  statistics: ProgressStatistics;
  loading: boolean;
  error: string | null;
}

export interface EventState {
  data: Event[];
  filteredData: Event[];
  filters: EventFilters;
  statistics: EventStatistics;
  loading: boolean;
  error: string | null;
}
