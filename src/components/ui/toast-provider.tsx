'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface Toast extends Required<ToastOptions> {
  id: string;
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((opts: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = {
      id,
      title: opts.title ?? '',
      description: opts.description ?? '',
      variant: opts.variant ?? 'default',
      durationMs: opts.durationMs ?? 3000,
    };
    setToasts(prev => [...prev, toast]);
    if (toast.durationMs > 0) {
      setTimeout(() => remove(id), toast.durationMs);
    }
  }, [remove]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastViewport({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 w-[min(92vw,380px)]">
      {toasts.map(t => (
        <div
          key={t.id}
          className={[
            'rounded-md shadow-lg border px-4 py-3 bg-white dark:bg-slate-800',
            t.variant === 'success' ? 'border-green-600/40' :
            t.variant === 'error' ? 'border-red-600/40' :
            t.variant === 'warning' ? 'border-amber-600/40' :
            'border-blue-600/30'
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          {t.title && (
            <div className="font-semibold text-sm mb-0.5 text-gray-900 dark:text-white">
              {t.title}
            </div>
          )}
          {t.description && (
            <div className="text-xs text-gray-700 dark:text-gray-300">
              {t.description}
            </div>
          )}
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => onClose(t.id)}
              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}






