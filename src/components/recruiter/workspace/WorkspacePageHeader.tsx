"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface WorkspaceBreadcrumb {
  label: string;
  href?: string;
}

export interface WorkspacePageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: readonly WorkspaceBreadcrumb[];
  actions?: ReactNode;
  titleId?: string;
  className?: string;
}

/**
 * Reusable heading and breadcrumb surface for new recruiter workspace pages.
 * Callers pass route-specific actions so this component cannot add unrelated entry points.
 */
export function WorkspacePageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs = [],
  actions,
  titleId,
  className,
}: WorkspacePageHeaderProps) {
  const generatedTitleId = useId();
  const headingId = titleId ?? generatedTitleId;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.header
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.3, ease: "easeOut" }
      }
      className={className}
    >
      <Card variant="flat" className="overflow-hidden motion-reduce:transition-none">
        {breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs sm:text-sm">
              {breadcrumbs.map((breadcrumb, index) => {
                const isCurrent = index === breadcrumbs.length - 1;

                return (
                  <li key={`${breadcrumb.label}-${index}`} className="flex items-center gap-1.5">
                    {index > 0 ? (
                      <ChevronRight
                        aria-hidden="true"
                        size={14}
                        className="shrink-0 text-white/35"
                      />
                    ) : null}
                    {breadcrumb.href && !isCurrent ? (
                      <Link
                        href={breadcrumb.href}
                        className="rounded-sm font-medium text-white/55 transition-colors hover:text-brand-cyan-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]"
                      >
                        {breadcrumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={isCurrent ? "page" : undefined}
                        className={cn(
                          "font-medium",
                          isCurrent ? "text-white/85" : "text-white/55"
                        )}
                      >
                        {breadcrumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan-light/85">
                {eyebrow}
              </p>
            ) : null}
            <h1
              id={headingId}
              className={cn(
                "font-bold tracking-tight text-white",
                eyebrow ? "mt-2" : "",
                "text-2xl sm:text-3xl"
              )}
            >
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div
              role="group"
              aria-label="Page actions"
              className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end"
            >
              {actions}
            </div>
          ) : null}
        </div>
      </Card>
    </motion.header>
  );
}
