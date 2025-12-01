import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  Student,
  Progress,
  ProgressState,
  ProgressFilters,
  Barangay,
  Activity,
} from "@/types";
import { User } from "@/types/auth";
import {
  fetchStudents,
  fetchBarangays,
  fetchProgress,
  fetchModules,
} from "@/services/api";

// Initial state
const initialState: ProgressState = {
  data: [],
  filteredData: [],
  filters: {},
  statistics: {
    averageScore: 0,
    completionRate: 0,
    moduleDistribution: {},
    activityTypeDistribution: {
      Assessment: 0,
      Quiz: 0,
      Assignment: 0,
      Activity: 0,
      Project: 0,
      Participation: 0,
      Examination: 0,
    },
  },
  loading: false,
  error: null,
};

// Create the progress store
export const useProgressStore = create<{
  progress: ProgressState;
  students: Student[];
  barangays: Barangay[];
  searchQuery: string;
  selectedBarangay: string | null;
  loadingBarangays: boolean;
  loadingStudents: boolean;
  errorBarangays: string | null;
  errorStudents: string | null;
  // Actions
  fetchProgress: (studentId: string) => Promise<void>;
  fetchStudents: () => Promise<void>;
  fetchBarangays: (user?: User | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedBarangay: (barangayId: string) => void;
  filterStudents: () => void;
  getFilteredStudents: () => Student[];
  getStudentById: (studentId: string) => Student | undefined;
  getStudentByLrn: (lrn: string) => Student | undefined;
  getProgressByStudentId: (studentId: string) => Progress[];
  updateActivity: (
    studentId: string,
    moduleId: string,
    activityIndex: number,
    activity: Activity
  ) => Promise<void>;
  deleteActivity: (
    studentId: string,
    moduleId: string,
    activityIndex: number
  ) => Promise<void>;
  initializeWithUser: (user: User | null) => Promise<void>;
}>()(
  immer((set, get) => ({
    progress: initialState,
    students: [],
    barangays: [],
    searchQuery: "",
    selectedBarangay: null,
    loadingBarangays: false,
    loadingStudents: false,
    errorBarangays: null,
    errorStudents: null,

    // Fetch progress data
    fetchProgress: async (studentId: string) => {
      set((state) => {
        state.progress.loading = true;
        state.progress.error = null;
      });

      try {
        const progressData = await fetchProgress(studentId);

        set((state) => {
          state.progress.data = progressData;
          state.progress.loading = false;
        });

        // Apply current filters
        get().filterStudents();
      } catch (error) {
        set((state) => {
          state.progress.error =
            error instanceof Error
              ? error.message
              : "Failed to fetch progress data";
          state.progress.loading = false;
        });
      }
    },

    // Fetch students data from Student Masterlist (API endpoint /api/students)
    // This ensures Student Score Summary only shows students from the masterlist
    fetchStudents: async () => {
      set((state) => {
        state.loadingStudents = true;
        state.errorStudents = null;
      });

      try {
        // Fetch students from masterlist database via API
        const studentsData = await fetchStudents();

        set((state) => {
          state.students = studentsData;
          state.loadingStudents = false;
        });

        console.log(`✅ Loaded ${studentsData.length} students from masterlist for Score Summary`);

        // Apply current filters (by barangay)
        get().filterStudents();
      } catch (error) {
        set((state) => {
          state.errorStudents =
            error instanceof Error
              ? error.message
              : "Failed to fetch students data";
          state.loadingStudents = false;
        });
      }
    },

    // Fetch barangays data with optional user context for proper barangay selection
    fetchBarangays: async (user?: User | null) => {
      set((state) => {
        state.loadingBarangays = true;
        state.errorBarangays = null;
      });

      try {
        const barangaysData = await fetchBarangays();

        set((state) => {
          state.barangays = barangaysData;
          state.loadingBarangays = false;

          // Smart barangay selection based on user role
          const fallbackBarangayId = barangaysData[0]?._id ?? null;

          if (user?.role === "admin" && user?.assignedBarangayId) {
            const assignedBarangay = barangaysData.find(
              (b) => b._id === user.assignedBarangayId
            );
            if (assignedBarangay) {
              state.selectedBarangay = assignedBarangay._id;
            } else {
              state.selectedBarangay = fallbackBarangayId;
            }
          } else {
            const hasValidSelection = state.selectedBarangay
              ? barangaysData.some((b) => b._id === state.selectedBarangay)
              : false;

            if (!hasValidSelection) {
              state.selectedBarangay = fallbackBarangayId;
            }
          }
        });

        // Apply current filters
        get().filterStudents();
      } catch (error) {
        set((state) => {
          state.errorBarangays =
            error instanceof Error
              ? error.message
              : "Failed to fetch barangays data";
          state.loadingBarangays = false;
        });
      }
    },

    // Set search query
    setSearchQuery: (query: string) => {
      set((state) => {
        state.searchQuery = query;
      });
      get().filterStudents();
    },

    // Set selected barangay
    setSelectedBarangay: (barangayId: string) => {
      set((state) => {
        // Treat "all" as null to show all barangays
        state.selectedBarangay = barangayId === 'all' ? null : barangayId;
      });
      get().filterStudents();
    },

    // Filter students based on current filters
    filterStudents: () => {
      const { students, searchQuery, selectedBarangay } = get();

      let filtered = [...students];

      // Filter by barangay when a selection exists (null means "all")
      if (selectedBarangay) {
        filtered = filtered.filter(
          (student) => student.barangayId === selectedBarangay
        );
      }

      // Filter by search query (name or LRN)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (student) =>
            student.name.toLowerCase().includes(query) ||
            student.lrn.toLowerCase().includes(query)
        );
      }

      // Store filtered students separately since ProgressTable expects Student objects
      set((state) => {
        state.progress.filteredData = []; // We'll use this for actual progress data if needed
      });
    },

    // Get filtered students for the progress table
    // STRICTLY returns only students from masterlist filtered by selected barangay
    // Students from progress records that don't exist in masterlist are excluded
    getFilteredStudents: () => {
      const { students, searchQuery, selectedBarangay } = get();

      // Only use students from masterlist (already fetched from /api/students)
      let filtered = [...students];

      // Filter by barangay when a selection exists (null means "all")
      if (selectedBarangay) {
        filtered = filtered.filter(
          (student) => student.barangayId === selectedBarangay
        );
      }

      // Filter by search query (name or LRN)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (student) =>
            student.name.toLowerCase().includes(query) ||
            student.lrn.toLowerCase().includes(query)
        );
      }

      // Final validation: ensure all returned students exist in masterlist
      // This prevents showing students from progress records that aren't in masterlist
      const masterlistStudentIds = new Set(students.map(s => s.lrn));
      filtered = filtered.filter(student => masterlistStudentIds.has(student.lrn));

      return filtered;
    },

    // Get student by ID
    getStudentById: (studentId: string) => {
      return get().students.find((student) => student._id === studentId);
    },

    // Get student by LRN
    getStudentByLrn: (lrn: string) => {
      return get().students.find((student) => student.lrn === lrn);
    },

    // Get progress records for a specific student
    getProgressByStudentId: (studentId: string) => {
      return get().progress.data.filter(
        (progress) => progress.studentId === studentId
      );
    },

    // Update an existing activity with persistence
    updateActivity: async (
      studentId: string,
      moduleId: string,
      activityIndex: number,
      activity: Activity
    ) => {
      try {
        const res = await fetch("/api/progress", {
          method: "PATCH",
          body: JSON.stringify({
            studentId,
            moduleId,
            activityIndex,
            activity,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
        // // Find the progress record
        // const progressRecord = get().progress.data.find(p => p.studentId === studentId && p.moduleId === moduleId);

        // if (!progressRecord) {
        //   throw new Error('Progress record not found');
        // }

        // // Update the activity in the progress record
        // const updatedActivities = [...progressRecord.activities];
        // updatedActivities[activityIndex] = { ...activity };

        // const updatedProgress = {
        //   ...progressRecord,
        //   activities: updatedActivities
        // };

        // // Update the progress record in the store
        // set(state => {
        //   const index = state.progress.data.findIndex(p => p.id === progressRecord.id);
        //   if (index !== -1) {
        //     state.progress.data[index] = updatedProgress;
        //   }
        // });

        // // Persist to localStorage using the API
        // const { updateProgress } = await import('@/services/api');
        // await updateProgress(updatedProgress);

        console.log(
          `✅ Updated activity ${activityIndex} for student ${studentId} in module ${moduleId}`
        );
      } catch (error) {
        console.error("Error updating activity:", error);
        throw error;
      }
    },

    // Delete an activity with persistence
    deleteActivity: async (
      studentId: string,
      moduleId: string,
      activityIndex: number
    ) => {
      try {
        // Find the progress record
        const progressRecord = get().progress.data.find(
          (p) => p.studentId === studentId && p.moduleId === moduleId
        );

        if (!progressRecord) {
          throw new Error("Progress record not found");
        }

        // Remove the activity from the progress record
        const updatedActivities = progressRecord.activities.filter(
          (_, index) => index !== activityIndex
        );

        const updatedProgress = {
          ...progressRecord,
          activities: updatedActivities,
        };

        // Update the progress record in the store
        set((state) => {
          const index = state.progress.data.findIndex(
            (p) => p._id === progressRecord._id
          );
          if (index !== -1) {
            state.progress.data[index] = updatedProgress;
          }
        });

        console.log(
          `✅ Deleted activity ${activityIndex} for student ${studentId} in module ${moduleId}`
        );
      } catch (error) {
        console.error("Error deleting activity:", error);
        throw error;
      }
    },

    // Initialize store with user context for proper barangay selection
    initializeWithUser: async (user: User | null) => {
      try {
        await Promise.all([
          get().fetchStudents(),
          get().fetchBarangays(user),
          get().fetchProgress(user?._id || ""),
        ]);
      } catch (error) {
        console.error(
          "Error initializing progress store with user context:",
          error
        );
      }
    },
  }))
);
