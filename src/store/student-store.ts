// @ts-ignore - available at runtime
import { create } from 'zustand';
// @ts-ignore - available at runtime
import { immer } from 'zustand/middleware/immer';
import { Student, StudentState, Barangay } from '@/types';
import { User } from '@/types/auth';
import {
  fetchStudents,
  fetchBarangays,
  createStudent,
  updateStudent,
  deleteStudent
} from '@/services/api';

// Initial state
const initialState: StudentState = {
  data: [],
  filteredData: [],
  filters: {},
  statistics: {
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    maleCount: 0,
    femaleCount: 0,
    programDistribution: {},
    barangayDistribution: {},
  },
  loading: false,
  error: null,
};

// Create the student store
export const useStudentStore = create<{
  students: StudentState;
  barangays: Barangay[];
  searchQuery: string;
  selectedBarangay: string | null;
  loadingBarangays: boolean;
  errorBarangays: string | null;
  // Actions
  fetchStudents: () => Promise<void>;
  fetchBarangays: (user?: User | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedBarangay: (barangayId: string) => void;
  filterStudents: () => void;
  addStudent: (student: Omit<Student, '_id'>) => Promise<Student>;
  editStudent: (student: Student) => Promise<Student>;
  removeStudent: (id: string) => Promise<void>;
  initializeWithUser: (user: User | null) => Promise<void>;
}>()(
  immer((set, get) => ({
    students: initialState,
    barangays: [],
    searchQuery: '',
    selectedBarangay: null,
    loadingBarangays: false,
    errorBarangays: null,

    // Fetch students
    fetchStudents: async () => {
      set(state => {
        state.students.loading = true;
        state.students.error = null;
      });

      try {
        const students = await fetchStudents();

        set(state => {
          state.students.data = students;
          state.students.filteredData = students;
          state.students.loading = false;

          // Calculate statistics
          state.students.statistics = {
            totalStudents: students.length,
            activeStudents: students.filter(s => s.status === 'active').length,
            inactiveStudents: students.filter(s => s.status === 'inactive').length,
            maleCount: students.filter(s => s.gender === 'male').length,
            femaleCount: students.filter(s => s.gender === 'female').length,
            programDistribution: students.reduce((acc, student) => {
              acc[student.program] = (acc[student.program] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            barangayDistribution: students.reduce((acc, student) => {
              acc[student.barangayId] = (acc[student.barangayId] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          };
        });

        // Apply any existing filters
        get().filterStudents();
      } catch (error) {
        set(state => {
          state.students.loading = false;
          state.students.error = error instanceof Error ? error.message : 'Failed to fetch students';
        });
      }
    },

    // Fetch barangays with optional user context for proper barangay selection
    fetchBarangays: async (user?: User | null) => {
      set(state => {
        state.loadingBarangays = true;
        state.errorBarangays = null;
      });

      try {
        const barangays = await fetchBarangays();

        set(state => {
          state.barangays = barangays;
          state.loadingBarangays = false;

          // Smart barangay selection based on user role
          const fallbackBarangayId = barangays[0]?._id ?? null;

          if (user?.role === 'admin' && user?.assignedBarangayId) {
            const assignedBarangay = barangays.find(b => b._id === user.assignedBarangayId);
            if (assignedBarangay) {
              state.selectedBarangay = assignedBarangay._id;
            } else {
              state.selectedBarangay = fallbackBarangayId;
            }
          } else {
            const hasValidSelection = state.selectedBarangay
              ? barangays.some(b => b._id === state.selectedBarangay)
              : false;

            if (!hasValidSelection) {
              state.selectedBarangay = fallbackBarangayId;
            }
          }
        });

        // Re-filter students after barangays are loaded
        get().filterStudents();
      } catch (error) {
        set(state => {
          state.loadingBarangays = false;
          state.errorBarangays = error instanceof Error ? error.message : 'Failed to fetch barangays';
        });
      }
    },

    // Set search query
    setSearchQuery: (query: string) => {
      set(state => {
        state.searchQuery = query;
      });
      get().filterStudents();
    },

    // Set selected barangay
    setSelectedBarangay: (barangayId: string) => {
      set(state => {
        // Treat "all" as null to show all barangays
        state.selectedBarangay = barangayId === 'all' ? null : barangayId;
      });
      get().filterStudents();
    },

    // Filter students based on search query and selected barangay
    filterStudents: () => {
      const { searchQuery, selectedBarangay, students } = get();

      set(state => {
        // Start with all students
        let filtered = students.data;

        // Filter by barangay when a selection exists (null means "all")
        if (selectedBarangay) {
          filtered = filtered.filter(student => student.barangayId === selectedBarangay);
        }

        // Filter by search query if provided
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(student =>
            student.name.toLowerCase().includes(query) ||
            student.lrn.toLowerCase().includes(query) ||
            student._id.toLowerCase().includes(query) ||
            student.address.toLowerCase().includes(query) ||
            student.program.toLowerCase().includes(query) ||
            student.status.toLowerCase().includes(query) ||
            student.gender.toLowerCase().includes(query)
          );
        }

        state.students.filteredData = filtered;
      });
    },

    // Add a new student
    addStudent: async (studentData: Omit<Student, '_id'>) => {
      set(state => {
        state.students.loading = true;
        state.students.error = null;
      });

      try {
        // Enforce unique LRN before creating
        const existing = get().students.data.find(s => s.lrn === studentData.lrn);
        if (existing) {
          throw new Error('This LRN is already taken.');
        }
        const newStudent = await createStudent(studentData);

        // Refetch students from database to ensure data consistency
        await get().fetchStudents();

        return newStudent;
      } catch (error) {
        set(state => {
          state.students.loading = false;
          state.students.error = error instanceof Error ? error.message : 'Failed to add student';
        });
        throw error;
      }
    },

    // Edit an existing student
    editStudent: async (updatedStudent: Student) => {
      set(state => {
        state.students.loading = true;
        state.students.error = null;
      });

      try {
        // Enforce unique LRN on update (allow same record)
        const conflict = get().students.data.find(s => s.lrn === updatedStudent.lrn && s._id !== updatedStudent._id);
        if (conflict) {
          throw new Error('This LRN is already taken.');
        }
        await updateStudent(updatedStudent);

        // Refetch students from database to ensure data consistency
        await get().fetchStudents();

        // Return the updated student from the refetched data
        const result = get().students.data.find(s => s._id === updatedStudent._id);
        if (!result) {
          throw new Error('Student not found after update');
        }
        return result;
      } catch (error) {
        set(state => {
          state.students.loading = false;
          state.students.error = error instanceof Error ? error.message : 'Failed to update student';
        });
        throw error;
      }
    },

    // Remove a student
    removeStudent: async (id: string) => {
      set(state => {
        state.students.loading = true;
        state.students.error = null;
      });

      try {
        await deleteStudent(id);

        // Refetch students from database to ensure data consistency
        // This also ensures progress records are removed (handled by API)
        await get().fetchStudents();
      } catch (error) {
        set(state => {
          state.students.loading = false;
          state.students.error = error instanceof Error ? error.message : 'Failed to delete student';
        });
        throw error;
      }
    },

    // Initialize store with user context for proper barangay selection
    initializeWithUser: async (user: User | null) => {
      try {
        await Promise.all([
          get().fetchStudents(),
          get().fetchBarangays(user)
        ]);
      } catch (error) {
        console.error('Error initializing student store with user context:', error);
      }
    },
  }))
);
