import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Font size options
export type FontSize = 'normal' | 'large' | 'extra-large';
export type Theme = 'light' | 'dark';

// Font size scale mapping
export const FONT_SIZE_SCALES = {
  normal: 1,
  large: 1.2,
  'extra-large': 1.4
} as const;

// Font size labels for UI
export const FONT_SIZE_LABELS = {
  normal: 'Normal',
  large: 'Large (+20%)',
  'extra-large': 'Extra Large (+40%)'
} as const;

interface AccessibilityState {
  // Font size settings
  fontSize: FontSize;
  fontScale: number;
  
  // Theme settings
  theme: Theme;
  
  // Actions
  setFontSize: (size: FontSize) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resetToDefaults: () => void;
}

// Default values
const DEFAULT_FONT_SIZE: FontSize = 'normal';
const DEFAULT_THEME: Theme = 'light';

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set, get) => ({
      // Initial state
      fontSize: DEFAULT_FONT_SIZE,
      fontScale: FONT_SIZE_SCALES[DEFAULT_FONT_SIZE],
      theme: DEFAULT_THEME,

      // Set font size and update scale
      setFontSize: (size: FontSize) => {
        const scale = FONT_SIZE_SCALES[size];
        set({ fontSize: size, fontScale: scale });

        console.log(`🔤 Font size changed to: ${FONT_SIZE_LABELS[size]} (${scale}x)`);
      },

      // Set theme
      setTheme: (theme: Theme) => {
        set({ theme });

        console.log(`🎨 Theme changed to: ${theme}`);
      },

      // Toggle between light and dark themes
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // Reset all accessibility settings to defaults
      resetToDefaults: () => {
        get().setFontSize(DEFAULT_FONT_SIZE);
        get().setTheme(DEFAULT_THEME);
        console.log('♿ Accessibility settings reset to defaults');
      }
    }),
    {
      name: 'als-accessibility-settings',
      version: 1,
      // Persist all accessibility settings
      partialize: (state) => ({
        fontSize: state.fontSize,
        theme: state.theme
      }),
      // Rehydrate settings on load (DOM manipulation moved to ThemeProvider)
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('♿ Accessibility settings restored from storage');
        }
      }
    }
  )
);

// Get accessibility settings (DOM manipulation moved to ThemeProvider)
export const getAccessibilitySettings = () => {
  const store = useAccessibilityStore.getState();
  return {
    theme: store.theme,
    fontSize: store.fontSize,
    fontScale: store.fontScale
  };
};
