import { StateCreator } from 'zustand';
import { ProgressState, Progress, Activity, ProgressFilters, ProgressStatistics } from '@/types';
import {
  fetchProgress,
  createProgress as apiCreateProgress,
  updateProgress as apiUpdateProgress,
  deleteProgress as apiDeleteProgress
} from '@/services/api';
import { filterProgress, calculateProgressStatistics } from '@/utils/dataUtils';

// Initial state for the progress slice
const initialProgressState: ProgressState = {
  data: [],
  filteredData: [],
  filters: {},
  statistics: {
    averageScore: 0,
    completionRate: 0,
    moduleDistribution: {},
    activityTypeDistribution: {
      'Assessment': 0,
      'Quiz': 0,
      'Assignment': 0,
      'Activity': 0,
      'Project': 0,
      'Participation': 0,
      'Examination': 0,
    }
  },
  loading: false,
  error: null
};

// Define the progress slice interface
interface ProgressSlice {
  data: Progress[];
  filteredData: Progress[];
  filters: ProgressFilters;
  statistics: ProgressStatistics;
  loading: boolean;
  error: string | null;
  // Actions
  loadProgress: () => Promise<void>;
  setFilters: (filters: ProgressFilters) => void;
  clearFilters: () => void;
  createProgress: (progress: Omit<Progress, 'id'>) => Promise<Progress>;
  updateProgress: (progress: Progress) => Promise<Progress>;
  deleteProgress: (id: string) => Promise<void>;
  addActivity: (progressId: string, activity: Activity) => Promise<Progress>;
  updateActivity: (progressId: string, activityIndex: number, activity: Activity) => Promise<Progress>;
  removeActivity: (progressId: string, activityIndex: number) => Promise<Progress>;
  getProgressByStudentId: (studentId: string) => Progress[];
  getStudentAverageScore: (studentId: string) => number;
}

// Create the progress slice
export const createProgressSlice: StateCreator<
  any,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  { progress: ProgressSlice }
> = (set, get) => ({
  progress: {
    ...initialProgressState,
    
    // Load progress records from API
    loadProgress: async () => {
      set(state => {
        state.progress.loading = true;
        state.progress.error = null;
      }, false, 'progress/loadProgress');
      
      try {
        const studentId = (get().progress.filters?.studentId) || "";
        const progress = await fetchProgress(studentId);
        
        set(state => {
          state.progress.data = progress;
          state.progress.filteredData = filterProgress(progress, state.progress.filters);
          state.progress.statistics = calculateProgressStatistics(progress);
          state.progress.loading = false;
        }, false, 'progress/loadProgress/success');
      } catch (error) {
        set(state => {
          state.progress.error = error instanceof Error ? error.message : 'Failed to load progress data';
          state.progress.loading = false;
        }, false, 'progress/loadProgress/error');
      }
    },
    
    // Set filters and update filtered data
    setFilters: (filters: ProgressFilters) => {
      set(state => {
        state.progress.filters = filters;
        state.progress.filteredData = filterProgress(state.progress.data, filters);
      }, false, 'progress/setFilters');
    },
    
    // Clear all filters
    clearFilters: () => {
      set(state => {
        state.progress.filters = {};
        state.progress.filteredData = state.progress.data;
      }, false, 'progress/clearFilters');
    },
    
    // Create a new progress record
    createProgress: async (progress: Omit<Progress, 'id'>) => {
      set(state => {
        state.progress.loading = true;
        state.progress.error = null;
      }, false, 'progress/createProgress');
      
      try {
        const newProgress = await apiCreateProgress(progress);
        
        set(state => {
          state.progress.data.push(newProgress);
          state.progress.filteredData = filterProgress(
            state.progress.data, 
            state.progress.filters
          );
          state.progress.statistics = calculateProgressStatistics(state.progress.data);
          state.progress.loading = false;
        }, false, 'progress/createProgress/success');
        
        return newProgress;
      } catch (error) {
        set(state => {
          state.progress.error = error instanceof Error ? error.message : 'Failed to create progress record';
          state.progress.loading = false;
        }, false, 'progress/createProgress/error');
        
        throw error;
      }
    },
    
    // Update an existing progress record
    updateProgress: async (updatedProgress: Progress): Promise<Progress> => {
      set(state => {
        state.progress.loading = true;
        state.progress.error = null;
      }, false, 'progress/updateProgress');
      
      try {
        const index = get().progress.data.findIndex(p => p.id === updatedProgress._id);
        if (index === -1) {
          throw new Error('Progress record not found');
        }
        const result = await apiUpdateProgress(
          updatedProgress._id,
          updatedProgress.studentId,
          index,
          updatedProgress.activities[index]
        );
        
        set(state => {
          const index = state.progress.data.findIndex(p => p.id === updatedProgress._id);
          if (index !== -1) {
            state.progress.data[index] = result;
          }
          
          state.progress.filteredData = filterProgress(
            state.progress.data, 
            state.progress.filters
          );
          state.progress.statistics = calculateProgressStatistics(state.progress.data);
          state.progress.loading = false;
        }, false, 'progress/updateProgress/success');

        return updatedProgress;
      } catch (error) {
        set(state => {
          state.progress.error = error instanceof Error ? error.message : 'Failed to update progress record';
          state.progress.loading = false;
        }, false, 'progress/updateProgress/error');
        
        throw error;
      }
    },
    
    // Delete a progress record
    deleteProgress: async (id: string) => {
      set(state => {
        state.progress.loading = true;
        state.progress.error = null;
      }, false, 'progress/deleteProgress');
      
      try {
        const progressRecord = get().progress.data.find(p => p.id === id);
        if (!progressRecord) {
          throw new Error('Progress record not found');
        }
        await apiDeleteProgress(id, progressRecord.studentId, progressRecord.moduleId);
        
        set(state => {
          state.progress.data = state.progress.data.filter(p => p.id !== id);
          state.progress.filteredData = filterProgress(
            state.progress.data, 
            state.progress.filters
          );
          state.progress.statistics = calculateProgressStatistics(state.progress.data);
          state.progress.loading = false;
        }, false, 'progress/deleteProgress/success');
      } catch (error) {
        set(state => {
          state.progress.error = error instanceof Error ? error.message : 'Failed to delete progress record';
          state.progress.loading = false;
        }, false, 'progress/deleteProgress/error');
        
        throw error;
      }
    },
    
    // Add an activity to a progress record
    addActivity: async (progressId: string, activity: Activity) => {
      const progressRecord = get().progress.data.find(p => p.id === progressId);
      
      if (!progressRecord) {
        throw new Error('Progress record not found');
      }
      
      const updatedProgress: Progress = {
        ...progressRecord,
        activities: [...progressRecord.activities, activity]
      };
      
      return await get().progress.updateProgress(updatedProgress);
    },
    
    // Update an activity in a progress record
    updateActivity: async (progressId: string, activityIndex: number, updatedActivity: Activity) => {
      const progressRecord = get().progress.data.find(p => p.id === progressId);

      if (!progressRecord) {
        throw new Error('Progress record not found');
      }

      const updatedActivities = [...progressRecord.activities];
      updatedActivities[activityIndex] = updatedActivity;

      const updatedProgress: Progress = {
        ...progressRecord,
        activities: updatedActivities
      };

      return await get().progress.updateProgress(updatedProgress);
    },
    
    // Remove an activity from a progress record
    removeActivity: async (progressId: string, activityIndex: number) => {
      const progressRecord = get().progress.data.find(p => p.id === progressId);
      
      if (!progressRecord) {
        throw new Error('Progress record not found');
      }
      
      const updatedActivities = progressRecord.activities.filter((_, index) => index !== activityIndex);
      
      const updatedProgress: Progress = {
        ...progressRecord,
        activities: updatedActivities
      };
      
      return get().progress.updateProgress(updatedProgress);
    },
    
    // Get progress records for a specific student
    getProgressByStudentId: (studentId: string) => {
      return get().progress.data.filter(p => p.studentId === studentId);
    },
    
    // Calculate average score for a student across all modules
    getStudentAverageScore: (studentId: string) => {
      const studentProgress = get().progress.data.filter(p => p.studentId === studentId);
      const allActivities = studentProgress.flatMap(p => p.activities);
      
      if (allActivities.length === 0) {
        return 0;
      }
      
      const totalScorePercentage = allActivities.reduce((sum, activity) => {
        return sum + (activity.score / activity.total * 100);
      }, 0);
      
      return totalScorePercentage / allActivities.length;
    }
  }
});
