"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type WorkspacePageShellWidth = "compact" | "standard" | "wide";

const widthClasses: Record<WorkspacePageShellWidth, string> = {
  compact: "max-w-4xl",
  standard: "max-w-6xl",
  wide: "max-w-7xl",
};

export interface WorkspacePageShellProps {
  children: ReactNode;
  /**
   * Provide the id of the page heading when the shell should be labelled by it.
   * Otherwise the default workspace label is used.
   */
  labelledBy?: string;
  ariaLabel?: string;
  maxWidth?: WorkspacePageShellWidth;
  className?: string;
  contentClassName?: string;
}

/**
 * Isolated structural shell for Phase 2 recruiter workspace routes.
 * It deliberately owns no navigation, request state, or dashboard composition.
 */
export function WorkspacePageShell({
  children,
  labelledBy,
  ariaLabel = "Recruiter hiring workspace",
  maxWidth = "wide",
  className,
  contentClassName,
}: WorkspacePageShellProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <main
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
      className={cn(
        "relative min-h-screen w-full overflow-x-hidden bg-[#050816] px-3 py-5 text-white sm:px-6 sm:py-7 lg:px-8 lg:py-8",
        className
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-[42rem] max-w-[130vw] -translate-x-1/2 rounded-full bg-brand-purple/10 blur-3xl" />
        <div className="absolute top-72 -right-28 h-64 w-64 rounded-full bg-brand-cyan/10 blur-3xl" />
        <div className="absolute bottom-8 -left-28 h-72 w-72 rounded-full bg-brand-indigo/10 blur-3xl" />
      </div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.35, ease: "easeOut" }
        }
        className={cn(
          "relative mx-auto w-full space-y-6 sm:space-y-8 lg:space-y-10",
          widthClasses[maxWidth],
          contentClassName
        )}
      >
        {children}
      </motion.div>
    </main>
  );
}
