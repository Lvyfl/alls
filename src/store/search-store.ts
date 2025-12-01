import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface SearchState {
  query: string;
  isActive: boolean;
  currentPage: 'students' | 'progress' | 'dashboard' | 'map' | null;
}

export interface SearchStore extends SearchState {
  // Actions
  setQuery: (query: string) => void;
  setCurrentPage: (page: SearchState['currentPage']) => void;
  setIsActive: (active: boolean) => void;
  clearSearch: () => void;
  getPlaceholder: () => string;
}

// Create the search store
export const useSearchStore = create<SearchStore>()(
  immer((set, get) => ({
    // Initial state
    query: '',
    isActive: false,
    currentPage: null,

    // Actions
    setQuery: (query: string) => {
      set(state => {
        state.query = query;
        state.isActive = query.trim().length > 0;
      });
    },

    setCurrentPage: (page: SearchState['currentPage']) => {
      set(state => {
        state.currentPage = page;
        // Clear search when changing pages
        state.query = '';
        state.isActive = false;
      });
    },

    setIsActive: (active: boolean) => {
      set(state => {
        state.isActive = active;
      });
    },

    clearSearch: () => {
      set(state => {
        state.query = '';
        state.isActive = false;
      });
    },

    getPlaceholder: () => {
      const { currentPage } = get();
      switch (currentPage) {
        case 'students':
          return 'Search students...';
        case 'progress':
          return 'Search students...';
        default:
          return 'Search...';
      }
    },
  }))
);
