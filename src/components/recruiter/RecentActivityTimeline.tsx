"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Briefcase,
  FileText,
  Inbox,
  RotateCcw,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatRelativeDate } from "@/lib/utils";

export interface RecruiterActivityItem {
  type: string;
  action: string;
  description: string;
  createdAt: string;
}

export interface RecentActivityTimelineProps {
  activities: RecruiterActivityItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  compact?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  limit?: number;
}

type ActivityPresentation = {
  icon: LucideIcon;
  categoryLabel: string;
  iconClassName: string;
  badgeClassName: string;
};

const DEFAULT_LIMIT = 6;
const SKELETON_ITEMS = Array.from({ length: 4 }, (_, index) => index);
const JOB_ACTIONS = new Set([
  "JOB_POSTED",
  "JOB_PUBLISHED",
  "JOB_ARCHIVED",
  "JOB_UPDATED",
]);

function normalizeActivityValue(value: string): string {
  return value.trim().toUpperCase().replace(/[\s.-]+/g, "_");
}

function formatActionLabel(action: string): string {
  const readableAction = action
    .trim()
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_.\-/]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  return readableAction
    ? `${readableAction.charAt(0).toUpperCase()}${readableAction.slice(1)}`
    : "Activity update";
}

function isApplicationActivity(type: string, action: string): boolean {
  const value = `${normalizeActivityValue(type)} ${normalizeActivityValue(action)}`;

  return /\b(APPLICATION|APPLICANT|CANDIDATE)\b/.test(value);
}

function isNewApplication(action: string): boolean {
  const normalizedAction = normalizeActivityValue(action);

  return /(CREATED|SUBMITTED|RECEIVED|APPLIED|NEW)/.test(normalizedAction);
}

function getActivityPresentation(
  type: string,
  action: string
): ActivityPresentation {
  const normalizedAction = normalizeActivityValue(action);

  if (JOB_ACTIONS.has(normalizedAction)) {
    return {
      icon: Briefcase,
      categoryLabel: "Job activity",
      iconClassName: "text-violet-200",
      badgeClassName:
        "border-violet-400/25 bg-violet-500/15 text-violet-200 shadow-violet-500/10",
    };
  }

  if (isApplicationActivity(type, action)) {
    if (isNewApplication(action)) {
      return {
        icon: UserPlus,
        categoryLabel: "New application",
        iconClassName: "text-cyan-200",
        badgeClassName:
          "border-cyan-400/25 bg-cyan-500/15 text-cyan-100 shadow-cyan-500/10",
      };
    }

    return {
      icon: FileText,
      categoryLabel: "Application update",
      iconClassName: "text-sky-200",
      badgeClassName:
        "border-sky-400/25 bg-sky-500/15 text-sky-100 shadow-sky-500/10",
    };
  }

  return {
    icon: Activity,
    categoryLabel: "Activity update",
    iconClassName: "text-white/75",
    badgeClassName:
      "border-white/15 bg-white/[0.07] text-white/75 shadow-black/10",
  };
}

function getVisibleActivities(
  activities: RecruiterActivityItem[],
  limit: number
): RecruiterActivityItem[] {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : DEFAULT_LIMIT;

  return activities.slice(0, safeLimit);
}

function ActivitySkeleton({ compact }: { compact: boolean }) {
  return (
    <ol
      aria-busy="true"
      aria-label="Loading recent activity"
      className={cn(compact ? "divide-y divide-white/6" : "")}
    >
      {SKELETON_ITEMS.map((index) => (
        <li
          key={index}
          className={cn(
            "relative",
            compact ? "flex gap-3 py-3 first:pt-0 last:pb-0" : "pb-5 pl-14 last:pb-0"
          )}
        >
          {!compact && index < SKELETON_ITEMS.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute left-5 top-10 bottom-0 w-px bg-gradient-to-b from-violet-400/70 via-cyan-300/45 to-white/10"
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              "skeleton shrink-0 rounded-xl",
              compact ? "mt-0.5 h-8 w-8" : "absolute left-0 top-0 h-10 w-10"
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "min-w-0 flex-1",
              compact
                ? "space-y-2"
                : "rounded-xl border border-white/6 bg-white/[0.025] px-3.5 py-3.5 sm:px-4"
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="skeleton h-3.5 w-28" />
              <span className="skeleton h-3 w-12" />
            </div>
            <span className="skeleton mt-2 block h-4 w-4/5 max-w-sm" />
          </div>
          <span className="sr-only">Loading activity {index + 1}</span>
        </li>
      ))}
    </ol>
  );
}

function ActivityItem({
  activity,
  compact,
  index,
  isLast,
  shouldReduceMotion,
}: {
  activity: RecruiterActivityItem;
  compact: boolean;
  index: number;
  isLast: boolean;
  shouldReduceMotion: boolean | null;
}) {
  const presentation = getActivityPresentation(activity.type, activity.action);
  const Icon = presentation.icon;
  const actionLabel = formatActionLabel(activity.action);
  const description = activity.description.trim() || "No additional details provided.";
  const relativeDate = formatRelativeDate(activity.createdAt);

  return (
    <motion.li
      initial={shouldReduceMotion ? false : { opacity: 0, y: compact ? 6 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.055,
        ease: "easeOut",
      }}
      className={cn(
        "relative min-w-0",
        compact ? "flex gap-3 py-3 first:pt-0 last:pb-0" : "pb-5 pl-14 last:pb-0"
      )}
    >
      {!compact && !isLast && (
        <span
          aria-hidden="true"
          className="absolute left-5 top-10 bottom-0 w-px bg-gradient-to-b from-violet-400/80 via-cyan-300/60 to-white/10"
        />
      )}

      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 inline-flex shrink-0 items-center justify-center border shadow-lg",
          presentation.badgeClassName,
          compact ? "mt-0.5 h-8 w-8 rounded-lg" : "absolute left-0 top-0 h-10 w-10 rounded-xl"
        )}
      >
        <Icon size={compact ? 15 : 18} strokeWidth={1.9} className={presentation.iconClassName} />
      </span>

      <div
        className={cn(
          "min-w-0 flex-1",
          compact
            ? "space-y-1"
            : "rounded-xl border border-white/6 bg-white/[0.025] px-3.5 py-3.5 transition-colors duration-200 hover:border-violet-400/20 hover:bg-white/[0.04] sm:px-4"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                presentation.badgeClassName
              )}
            >
              {presentation.categoryLabel}
            </span>
            <span className="text-sm font-semibold text-white/90">{actionLabel}</span>
          </div>
          <time
            dateTime={activity.createdAt}
            className="shrink-0 text-xs font-medium tabular-nums text-white/45"
          >
            {relativeDate}
          </time>
        </div>
        <p className="mt-1.5 text-sm leading-5 text-white/65">{description}</p>
      </div>
    </motion.li>
  );
}

function ActivityError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3.5 py-3 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <AlertCircle
          aria-hidden="true"
          size={18}
          strokeWidth={1.9}
          className="mt-0.5 shrink-0 text-red-300"
        />
        <span className="leading-5">{error}</span>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="w-fit shrink-0 border-red-300/25 text-red-100 hover:border-red-300/45 hover:text-white"
        >
          <RotateCcw aria-hidden="true" size={14} strokeWidth={1.9} />
          Try again
        </Button>
      )}
    </div>
  );
}

function EmptyActivityState({
  compact,
  title,
  description,
}: {
  compact: boolean;
  title: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center",
        compact ? "px-4 py-6" : "px-5 py-9 sm:px-8"
      )}
    >
      <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
        <Inbox aria-hidden="true" size={20} strokeWidth={1.8} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-white/90">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-white/55">{description}</p>
    </div>
  );
}

export function RecentActivityTimeline({
  activities,
  loading = false,
  error = null,
  onRetry,
  compact = false,
  emptyTitle = "No recent activity",
  emptyDescription = "New hiring and application updates will appear here.",
  limit = DEFAULT_LIMIT,
}: RecentActivityTimelineProps) {
  const shouldReduceMotion = useReducedMotion();

  if (loading) {
    return <ActivitySkeleton compact={compact} />;
  }

  if (error) {
    return <ActivityError error={error} onRetry={onRetry} />;
  }

  const visibleActivities = getVisibleActivities(activities, limit);

  if (visibleActivities.length === 0) {
    return (
      <EmptyActivityState
        compact={compact}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <section aria-label="Recent recruitment activity" className="w-full">
      <ol className={cn(compact ? "divide-y divide-white/6" : "")}>
        {visibleActivities.map((activity, index) => (
          <ActivityItem
            key={`${activity.type}-${activity.action}-${activity.createdAt}-${index}`}
            activity={activity}
            compact={compact}
            index={index}
            isLast={index === visibleActivities.length - 1}
            shouldReduceMotion={shouldReduceMotion}
          />
        ))}
      </ol>
    </section>
  );
}
