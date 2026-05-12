"use client";

import { useEffect, useState } from "react";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

/**
 * Lightweight client-side toast list: owns local queue state via `useToast`,
 * optional global fan-out via `showToast`, and token-aligned surface styling.
 * Does not portal; mount near the page root so `position: fixed` is not clipped
 * by transformed ancestors.
 */

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration ?? 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onRemove]);

  const icons = {
    success: CheckCircleIcon,
    error: ExclamationTriangleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
  };

  const styles = {
    success: "border border-success bg-success/10 text-success-foreground",
    error: "border border-danger bg-danger/10 text-danger-foreground",
    warning: "border border-warning bg-warning/10 text-warning-foreground",
    info: "border border-border bg-surface text-foreground",
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`animate-in slide-in-from-bottom-2 pointer-events-auto flex items-start gap-3 rounded-lg p-4 shadow-lg transition-all ${styles[toast.type]}`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${toast.type === "info" ? "text-accent" : ""}`}
        aria-hidden
      />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="text-foreground/80 hover:bg-default shrink-0 rounded p-1 transition-colors"
        aria-label="Dismiss"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Renders queued toasts in a fixed bottom stack using `--z-toast` so items sit
 * above modal and in-page overlay layers without intercepting pointer events
 * on the rest of the viewport.
 *
 * @param toasts - Active toast records to display.
 * @param onRemove - Removes a toast by id when dismissed or after duration.
 */
export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none z-toast fixed bottom-4 left-1/2 flex -translate-x-1/2 flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

let toastIdCounter = 0;
const toastListeners: Array<(toast: Toast) => void> = [];

/**
 * Enqueues a toast for every mounted `useToast` listener in the tab; prefer
 * `useToast().showToast` when only one surface should receive the message.
 */
export function showToast(
  message: string,
  type: ToastType = "info",
  duration?: number,
) {
  const toast: Toast = {
    id: `toast-${toastIdCounter++}`,
    message,
    type,
    duration,
  };
  toastListeners.forEach((listener) => listener(toast));
}

/**
 * Holds toast queue state for the calling component tree and subscribes to
 * global `showToast` broadcasts until unmount.
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
    };
    toastListeners.push(listener);
    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToastLocal = (
    message: string,
    type: ToastType = "info",
    duration?: number,
  ) => {
    const toast: Toast = {
      id: `toast-${toastIdCounter++}`,
      message,
      type,
      duration,
    };
    setToasts((prev) => [...prev, toast]);
  };

  return { toasts, removeToast, showToast: showToastLocal };
}
