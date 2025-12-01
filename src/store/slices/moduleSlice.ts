import { StateCreator } from 'zustand';
import { ModuleState, Module } from '@/types';
import { fetchModules } from '@/services/api';

// Initial state for the module slice
const initialModuleState: ModuleState = {
  data: [],
  loading: false,
  error: null
};

// Define the module slice interface
interface ModuleSlice {
  data: Module[];
  loading: boolean;
  error: string | null;
  // Actions
  loadModules: () => Promise<void>;
  getModuleById: (id: string) => Module | undefined;
  getModuleTitleById: (id: string) => string;
  getModulesByProgram: (program: string) => Module[];
}

// Create the module slice
export const createModuleSlice: StateCreator<
  any,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  { modules: ModuleSlice }
> = (set, get) => ({
  modules: {
    ...initialModuleState,
    
    // Load modules from API
    loadModules: async () => {
      set(state => {
        state.modules.loading = true;
        state.modules.error = null;
      }, false, 'modules/loadModules');
      
      try {
        const modules = await fetchModules();
        
        set(state => {
          state.modules.data = modules;
          state.modules.loading = false;
        }, false, 'modules/loadModules/success');
      } catch (error) {
        set(state => {
          state.modules.error = error instanceof Error ? error.message : 'Failed to load modules';
          state.modules.loading = false;
        }, false, 'modules/loadModules/error');
      }
    },
    
    // Get a module by ID
    getModuleById: (id: string) => {
      return get().modules.data.find(module => module.id === id);
    },
    
    // Get module title by ID
    getModuleTitleById: (id: string) => {
      const module = get().modules.data.find(m => m.id === id);
      return module ? module.title : 'Unknown Module';
    },
    
    // Get modules by program
    getModulesByProgram: (program: string) => {
      return get().modules.data.filter(module => 
        module.levels.includes(program) || module.levels.includes('All Programs')
      );
    }
  }
});
