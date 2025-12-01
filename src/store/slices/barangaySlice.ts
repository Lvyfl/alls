import { StateCreator } from 'zustand';
import { BarangayState, Barangay } from '@/types';
import { fetchBarangays } from '@/services/api';

// Initial state for the barangay slice
const initialBarangayState: BarangayState = {
  data: [],
  loading: false,
  error: null
};

// Define the barangay slice interface
interface BarangaySlice {
  data: Barangay[];
  loading: boolean;
  error: string | null;
  // Actions
  loadBarangays: () => Promise<void>;
  getBarangayById: (id: string) => Barangay | undefined;
  getBarangayNameById: (id: string) => string;
}

// Create the barangay slice
export const createBarangaySlice: StateCreator<
  any,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  { barangays: BarangaySlice }
> = (set, get) => ({
  barangays: {
    ...initialBarangayState,
    
    // Load barangays from API
    loadBarangays: async () => {
      set(state => {
        state.barangays.loading = true;
        state.barangays.error = null;
      }, false, 'barangays/loadBarangays');
      
      try {
        const barangays = await fetchBarangays();
        
        set(state => {
          state.barangays.data = barangays;
          state.barangays.loading = false;
        }, false, 'barangays/loadBarangays/success');
      } catch (error) {
        set(state => {
          state.barangays.error = error instanceof Error ? error.message : 'Failed to load barangays';
          state.barangays.loading = false;
        }, false, 'barangays/loadBarangays/error');
      }
    },
    
    // Get a barangay by ID
    getBarangayById: (id: string) => {
      return get().barangays.data.find(barangay => barangay.id === id);
    },
    
    // Get barangay name by ID
    getBarangayNameById: (id: string) => {
      const barangay = get().barangays.data.find(b => b.id === id);
      return barangay ? barangay.name : 'Unknown Barangay';
    }
  }
});
