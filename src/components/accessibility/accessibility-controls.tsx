'use client';

import { useState } from 'react';
import { useAccessibilityStore, FontSize, FONT_SIZE_LABELS } from '@/store/accessibility-store';
import { Button } from '@/components/ui/button';
import {
  Sun,
  Moon,
  Type,
  Check,
  RotateCcw,
  Accessibility,
  ChevronDown
} from 'lucide-react';

interface AccessibilityControlsProps {
  variant?: 'header' | 'sidebar' | 'floating';
  showLabels?: boolean;
}

export function AccessibilityControls({
  variant = 'header',
  showLabels = false
}: AccessibilityControlsProps) {
  const { fontSize, theme, setFontSize, setTheme, toggleTheme, resetToDefaults } = useAccessibilityStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setIsOpen(false);
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  };

  // Compact version for header/sidebar
  if (variant === 'header' || variant === 'sidebar') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="relative focus-theme hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Accessibility settings"
          title="Accessibility Settings"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Accessibility className="h-5 w-5" />
          {showLabels && <span className="ml-2 text-sm">Accessibility</span>}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Accessibility className="h-4 w-4" />
                Accessibility Settings
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="p-2">
              <button
                onClick={handleThemeToggle}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {theme === 'light' ? (
                    <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Click to toggle
                </span>
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Font Size Options */}
            <div className="p-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 px-2">
                <Type className="h-3 w-3" />
                Font Size
              </div>

              {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => handleFontSizeChange(size)}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {FONT_SIZE_LABELS[size]}
                  </span>
                  {fontSize === size && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Reset Button */}
            <div className="p-2">
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-600 dark:text-gray-400"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">Reset to Defaults</span>
              </button>
            </div>
          </div>
        )}

        {/* Backdrop to close dropdown */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Floating version for dedicated accessibility panel
  if (variant === 'floating') {
    return (
      <div className="bg-theme-surface border-theme-strong border-4 rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Accessibility className="h-5 w-5 text-primary" />
          <h3 className="font-scale-lg font-bold text-theme-primary">
            Accessibility Settings
          </h3>
        </div>
        
        {/* Theme Toggle */}
        <div className="mb-6">
          <label className="block font-scale-sm font-medium text-theme-primary mb-2">
            Theme
          </label>
          <Button
            onClick={handleThemeToggle}
            variant="outline"
            className="w-full justify-start border-theme-strong hover:bg-theme-surface-elevated focus-theme"
          >
            {theme === 'light' ? (
              <>
                <Sun className="h-4 w-4 mr-2" />
                <span className="font-scale-sm">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2" />
                <span className="font-scale-sm">Dark Mode</span>
              </>
            )}
          </Button>
        </div>
        
        {/* Font Size Selection */}
        <div className="mb-6">
          <label className="block font-scale-sm font-medium text-theme-primary mb-2">
            <Type className="h-4 w-4 inline mr-1" />
            Font Size
          </label>
          <div className="space-y-2">
            {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((size) => (
              <Button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                variant={fontSize === size ? "default" : "outline"}
                className="w-full justify-between border-theme-strong hover:bg-theme-surface-elevated focus-theme"
              >
                <span className="font-scale-sm">{FONT_SIZE_LABELS[size]}</span>
                {fontSize === size && <Check className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Reset Button */}
        <Button
          onClick={handleReset}
          variant="outline"
          className="w-full border-theme-strong hover:bg-theme-surface-elevated focus-theme text-theme-secondary"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          <span className="font-scale-sm">Reset to Defaults</span>
        </Button>
      </div>
    );
  }

  return null;
}
