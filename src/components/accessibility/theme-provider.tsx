'use client';

import { useEffect, useState } from 'react';
import { useAccessibilityStore } from '@/store/accessibility-store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, fontSize, fontScale } = useAccessibilityStore();

  // Initialize accessibility settings on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update theme when it changes (only after mount to avoid hydration issues)
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme);

      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme, mounted]);

  // Update font scale when it changes (only after mount to avoid hydration issues)
  useEffect(() => {
    if (mounted) {
      document.documentElement.style.setProperty('--font-scale', fontScale.toString());
    }
  }, [fontScale, mounted]);

  // Apply initial settings immediately after mount
  useEffect(() => {
    if (mounted) {
      // Apply theme
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Apply font scale
      document.documentElement.style.setProperty('--font-scale', fontScale.toString());
    }
  }, [mounted, theme, fontScale]);

  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary transition-colors duration-200">
      {children}
    </div>
  );
}
