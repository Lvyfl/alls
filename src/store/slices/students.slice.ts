import { StateCreator } from 'zustand';
import { StudentState, Student, StudentFilters } from '@/types';
import { 
  fetchStudents, 
  createStudent as apiCreateStudent,
  updateStudent as apiUpdateStudent,
  deleteStudent as apiDeleteStudent
} from '@/services/api';
import { filterStudents, calculateStudentStatistics } from '@/utils/dataUtils';

// Initial state for the student slice
const initialStudentState: StudentState = {
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
    barangayDistribution: {}
  },
  loading: false,
  error: null
};

// Define the student slice interface
interface StudentSlice {
  data: Student[];
  filteredData: Student[];
  filters: StudentFilters;
  statistics: any;
  loading: boolean;
  error: string | null;
  // Actions
  loadStudents: () => Promise<void>;
  setFilters: (filters: StudentFilters) => void;
  clearFilters: () => void;
  createStudent: (student: Omit<Student, 'id'>) => Promise<Student>;
  updateStudent: (student: Student) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
}

// Create the student slice
export const createStudentSlice: StateCreator<
  any,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  { students: StudentSlice }
> = (set, get) => ({
  students: {
    ...initialStudentState,
    
    // Load students from API
    loadStudents: async () => {
      set(state => {
        state.students.loading = true;
        state.students.error = null;
      }, false, 'students/loadStudents');
      
      try {
        const students = await fetchStudents();
        
        set(state => {
          state.students.data = students;
          state.students.filteredData = filterStudents(students, state.students.filters);
          state.students.statistics = calculateStudentStatistics(students);
          state.students.loading = false;
        }, false, 'students/loadStudents/success');
      } catch (error) {
        set(state => {
          state.students.error = error instanceof Error ? error.message : 'Failed to load students';
          state.students.loading = false;
        }, false, 'students/loadStudents/error');
      }
    },
    
    // Set filters and update filtered data
    setFilters: (filters: StudentFilters) => {
      set(state => {
        state.students.filters = filters;
        state.students.filteredData = filterStudents(state.students.data, filters);
      }, false, 'students/setFilters');
    },
    
    // Clear all filters
    clearFilters: () => {
      set(state => {
        state.students.filters = {};
        state.students.filteredData = state.students.data;
      }, false, 'students/clearFilters');
    },
    
    // Create a new student
    createStudent: async (student: Omit<Student, 'id'>) => {
      set(state => {
        state.students.loading = true;
        state.students.error = null;
      }, false, 'students/createStudent');
      
      try {
        const newStudent = await apiCreateStudent(student);
        
        set(state => {
          state.students.data.push(newStudent);
          state.students.filteredData = filterStudents(
            state.students.data, 
            state.students.filters
          );
          state.students.statistics = calculateStudentStatistics(state.students.data);
          state.students.loading = false;
        }, false, 'students/createStudent/success');
        
        return newStudent;
      } catch (error) {
        set(state => {
          state.students.error = error instanceof Error ? error.message : 'Failed to create student';
          state.students.loading = false;
        }, false, 'students/createStudent/error');
        
        throw error;
      }
    },
    
    // Update an existing student
    updateStudent: async (updatedStudent: Student) => {
      set(state => {
        state.students.loading = true;
        state.students.error = null;
      }, false, 'students/updateStudent');
      
      try {
        const result = await apiUpdateStudent(updatedStudent);
        
        set(state => {
          const index = state.students.data.findIndex(s => s.id === updatedStudent._id);
          if (index !== -1) {
            state.students.data[index] = result;
          }
          
          state.students.filteredData = filterStudents(
            state.students.data, 
            state.students.filters
          );
          state.students.statistics = calculateStudentStatistics(state.students.data);
          state.students.loading = false;
        }, false, 'students/updateStudent/success');
        
        return result;
      } catch (error) {
        set(state => {
          state.students.error = error instanceof Error ? error.message : 'Failed to update student';
          state.students.loading = false;
        }, false, 'students/updateStudent/error');
        
        throw error;
      }
    },
    
    // Delete a student
    deleteStudent: async (id: string) => {
      set(state => {
        state.students.loading = true;
        state.students.error = null;
      }, false, 'students/deleteStudent');
      
      try {
        await apiDeleteStudent(id);
        
        set(state => {
          state.students.data = state.students.data.filter(s => s.id !== id);
          state.students.filteredData = filterStudents(
            state.students.data, 
            state.students.filters
          );
          state.students.statistics = calculateStudentStatistics(state.students.data);
          state.students.loading = false;
        }, false, 'students/deleteStudent/success');
      } catch (error) {
        set(state => {
          state.students.error = error instanceof Error ? error.message : 'Failed to delete student';
          state.students.loading = false;
        }, false, 'students/deleteStudent/error');
        
        throw error;
      }
    }
  }
});
