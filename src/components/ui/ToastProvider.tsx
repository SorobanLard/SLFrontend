'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastRole = 'status' | 'alert';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  role: ToastRole;
  duration: number;
};

type ToastOptions = {
  title: string;
  description?: string;
  duration?: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  push: (toast: ToastOptions & { variant?: ToastVariant; role?: ToastRole }) => void;
  dismiss: (id: string) => void;
  success: (toast: ToastOptions) => void;
  error: (toast: ToastOptions) => void;
  warning: (toast: ToastOptions) => void;
  info: (toast: ToastOptions) => void;
};

const MAX_VISIBLE_TOASTS = 3;
const SWIPE_DISMISS_THRESHOLD = 80;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dragX, setDragX] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused || isLeaving) return;
    const timer = window.setTimeout(() => {
      setIsLeaving(true);
      window.setTimeout(() => onDismiss(toast.id), 220);
    }, toast.duration);

    return () => window.clearTimeout(timer);
  }, [isLeaving, isPaused, onDismiss, toast.duration, toast.id]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const currentX = event.touches[0]?.clientX ?? touchStartX.current;
    setDragX(currentX - touchStartX.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(dragX) >= SWIPE_DISMISS_THRESHOLD) {
      setIsLeaving(true);
      window.setTimeout(() => onDismiss(toast.id), 180);
    } else {
      setDragX(0);
    }
    touchStartX.current = null;
  }, [dragX, onDismiss, toast.id]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsPaused(false);
    }
  }, []);

  const accent = {
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    error: 'border-rose-300 bg-rose-50 text-rose-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    info: 'border-[#D5D2F6] bg-[#F4F2FF] text-[#26215C]',
  }[toast.variant];

  const titleId = `toast-title-${toast.id}`;
  const descId = toast.description ? `toast-desc-${toast.id}` : undefined;

  return (
    <div
      data-toast-id={toast.id}
      role={toast.role}
      aria-live={toast.role === 'alert' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={handleBlur}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={dragX !== 0 ? { transform: `translateX(${dragX}px)` } : undefined}
      className={cn(
        'pointer-events-auto w-[min(22rem,calc(100vw-2rem))] touch-pan-y rounded-2xl border p-4 shadow-lg backdrop-blur transition-all duration-300',
        accent,
        isLeaving ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id={titleId} className="text-sm font-semibold">{toast.title}</p>
          {toast.description ? (
            <p id={descId} className="mt-1 text-sm leading-6 opacity-90">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-full p-1 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          aria-label={`Dismiss notification: ${toast.title}`}
          onClick={() => {
            setIsLeaving(true);
            window.setTimeout(() => onDismiss(toast.id), 180);
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const visibleToasts = useMemo(() => toasts.slice(0, MAX_VISIBLE_TOASTS), [toasts]);

  useEffect(() => {
    if (visibleToasts.length === 0) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const focusedToastEl =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest<HTMLElement>('[data-toast-id]')
          : null;
      const focusedId = focusedToastEl?.dataset.toastId;
      if (focusedId) {
        dismiss(focusedId);
        return;
      }
      const latestVisible = visibleToasts[visibleToasts.length - 1];
      if (latestVisible) dismiss(latestVisible.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dismiss, visibleToasts]);

  const push = useCallback(
    ({ title, description, duration = 4000, variant = 'info', role }: ToastOptions & { variant?: ToastVariant; role?: ToastRole }) => {
      const id = createToastId();
      const toast: ToastItem = { id, title, description, variant, role: role ?? (variant === 'error' ? 'alert' : 'status'), duration };
      setToasts((current) => [...current, toast]);
    },
    [],
  );

  const success = useCallback((toast: ToastOptions) => push({ ...toast, variant: 'success' }), [push]);
  const error = useCallback((toast: ToastOptions) => push({ ...toast, variant: 'error' }), [push]);
  const warning = useCallback((toast: ToastOptions) => push({ ...toast, variant: 'warning' }), [push]);
  const info = useCallback((toast: ToastOptions) => push({ ...toast, variant: 'info' }), [push]);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, push, dismiss, success, error, warning, info }),
    [dismiss, error, info, push, success, toasts, warning],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 top-4 z-[80] flex flex-col gap-3"
      >
        {visibleToasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used inside ToastProvider');
  }
  return context;
}
