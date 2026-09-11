"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success:
          "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
        warning:
          "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface ToastProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "warning";
  className?: string;
  onClose?: (id: string) => void;
}

const ToasterToast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, id, title, description, action, variant, onClose }) => {
    return (
      <div className={cn(toastVariants({ variant }), className)}>
        <div className="flex-1 space-y-1">
          {title && <div className="text-sm font-semibold">{title}</div>}
          {description && (
            <div className="text-sm opacity-90">{description}</div>
          )}
        </div>
        {action}
        {onClose && (
          <button
            type="button"
            onClick={() => onClose(id)}
            className="absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
ToasterToast.displayName = "Toast";

export interface ToastOptions {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "warning";
  duration?: number;
}

interface StoredToast extends ToastOptions {
  id: string;
  open: boolean;
}

type ToastState = StoredToast[];

const listeners = new Set<(toasts: ToastState) => void>();

let toastState: ToastState = [];

let toastCount = 0;

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return toastCount.toString();
}

function emit() {
  listeners.forEach((listener) => listener(toastState));
}

function toast(options: ToastOptions) {
  const id = options.id || genId();
  const duration = options.duration ?? 5000;

  toastState = [
    { ...options, id, open: true },
    ...toastState.filter((t) => t.id !== id),
  ];
  emit();

  if (duration > 0) {
    setTimeout(() => {
      dismiss(id);
    }, duration);
  }

  return id;
}

function dismiss(id: string) {
  if (!toastState.some((t) => t.id === id)) return;
  toastState = toastState.filter((t) => t.id !== id);
  emit();
}

function dismissAll() {
  toastState = [];
  emit();
}

interface ToastContextValue {
  toasts: ToastState;
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined
);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState>(toastState);

  React.useEffect(() => {
    const listener = (state: ToastState) => setToasts([...state]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({ toasts, toast, dismiss, dismissAll }),
    [toasts]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
      {toasts.map((t) => (
        <ToasterToast
          key={t.id}
          id={t.id}
          title={t.title}
          description={t.description}
          action={t.action}
          variant={t.variant}
          onClose={dismiss}
        />
      ))}
    </div>
  );
}

export {
  toast,
  dismiss,
  dismissAll,
  ToastProvider,
  useToast,
  Toaster,
  ToasterToast,
};
export type { ToastProps };