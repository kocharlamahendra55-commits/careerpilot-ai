"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceToastVariant = "success" | "error";

export interface WorkspaceToastInput {
  readonly title: string;
  readonly description?: string;
  readonly variant?: WorkspaceToastVariant;
  /** Auto-dismiss delay in ms; defaults to 5000. Pass 0 to disable auto-dismiss. */
  readonly durationMs?: number;
}

interface WorkspaceToast extends WorkspaceToastInput {
  readonly id: number;
  readonly variant: WorkspaceToastVariant;
}

export interface WorkspaceToastContextValue {
  /** Enqueues a toast. Safe to call outside a provider (becomes a no-op). */
  readonly showToast: (toast: WorkspaceToastInput) => void;
}

const DEFAULT_TOAST_DURATION_MS = 5000;

/**
 * A no-op default keeps `useWorkspaceToast()` safe when a consumer renders
 * outside the candidate workspace subtree (e.g. isolated tests), instead of
 * throwing like the strictly-scoped detail cache does.
 */
const WorkspaceToastContext = createContext<WorkspaceToastContextValue>({
  showToast: () => {},
});

export function useWorkspaceToast(): WorkspaceToastContextValue {
  return useContext(WorkspaceToastContext);
}

/**
 * A lightweight, dependency-free toast host scoped to the candidate workspace.
 * The live region is always mounted so `aria-live="polite"` announcements are
 * reliable, and every toast can be dismissed manually or after an auto-dismiss
 * delay. It adds no global, app-wide notification system.
 */
export function WorkspaceToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly WorkspaceToast[]>([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timers = timersRef.current;
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: WorkspaceToastInput) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;

      const toast: WorkspaceToast = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "success",
        durationMs: input.durationMs,
      };

      setToasts((current) => [...current, toast]);

      const duration = input.durationMs ?? DEFAULT_TOAST_DURATION_MS;
      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismissToast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const value = useMemo<WorkspaceToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <WorkspaceToastContext.Provider value={value}>
      {children}
      <WorkspaceToastViewport toasts={toasts} onDismiss={dismissToast} />
    </WorkspaceToastContext.Provider>
  );
}

function WorkspaceToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: readonly WorkspaceToast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-3 sm:inset-x-auto sm:right-0 sm:items-end sm:p-4"
    >
      {toasts.map((toast) => (
        <WorkspaceToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function WorkspaceToastCard({
  toast,
  onDismiss,
}: {
  toast: WorkspaceToast;
  onDismiss: (id: number) => void;
}) {
  const isError = toast.variant === "error";
  const Icon = isError ? XCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3.5 shadow-2xl shadow-black/40 backdrop-blur-md",
        "motion-safe:animate-slide-up motion-reduce:animate-none motion-reduce:transition-none",
        isError
          ? "border-red-500/30 bg-[#1b0b12]/90 text-red-50"
          : "border-emerald-400/25 bg-[#08160f]/90 text-emerald-50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
          isError ? "text-red-300" : "text-emerald-300"
        )}
      >
        <Icon aria-hidden="true" size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5">{toast.title}</p>
        {toast.description ? (
          <p className={cn("mt-0.5 text-xs leading-5", isError ? "text-red-100/80" : "text-emerald-100/80")}>
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]"
      >
        <X aria-hidden="true" size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
