"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JobCard } from "@/components/student/jobs/JobCard";
import { JobCardSkeleton } from "@/components/student/jobs/JobCardSkeleton";
import { usePublishedJobs } from "@/features/student-jobs/use-published-jobs";
import {
  BROWSE_JOBS_PAGE_SIZE,
  transformBrowseJobs,
  type BrowseSortOrder,
} from "@/features/student-jobs/browse-transform";
import { getAppliedJobIds, subscribeAppliedJobs } from "@/features/student-jobs/applied-store";

const CONTROL_CLASS_NAME =
  "h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 hover:border-white/20 focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/60 focus:ring-offset-2 focus:ring-offset-[#050816]";

const SKELETON_KEYS = Array.from({ length: 6 }, (_, index) => `job-skeleton-${index}`);

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

const gridContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const gridItem = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function BrowseJobsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [sort, setSort] = useState<BrowseSortOrder>("newest");
  const [page, setPage] = useState(1);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(() => new Set());

  const { phase, jobs, errorMessage, reload } = usePublishedJobs(searchInput);

  // Reflect applied badges from the session store, updating on same-tab and
  // cross-tab changes (Part 2 writes to this store after a successful apply).
  useEffect(() => {
    setAppliedIds(getAppliedJobIds());
    return subscribeAppliedJobs(() => setAppliedIds(getAppliedJobIds()));
  }, []);

  const jobsList = jobs ?? [];

  const result = useMemo(
    () => transformBrowseJobs(jobsList, { location, sort, page, pageSize: BROWSE_JOBS_PAGE_SIZE }),
    [jobsList, location, sort, page]
  );

  // Keep the requested page in range after the underlying result set changes.
  useEffect(() => {
    if (page !== result.page) {
      setPage(result.page);
    }
  }, [page, result.page]);

  // Drop a stale location filter that no longer exists in the loaded jobs.
  useEffect(() => {
    if (location !== null && !result.locationOptions.includes(location)) {
      setLocation(null);
      setPage(1);
    }
  }, [location, result.locationOptions]);

  const trimmedSearch = searchInput.trim();
  const hasActiveControls = trimmedSearch.length > 0 || location !== null || sort !== "newest";

  const isInitialLoading = phase === "loading";
  const isRefreshing = phase === "refreshing";
  const hasJobs = jobsList.length > 0;
  const showBlockingError = phase === "error" && !hasJobs;
  const showInlineError = phase === "error" && hasJobs;

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleLocationChange(value: string) {
    setLocation(value.length > 0 ? value : null);
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSort(value === "oldest" ? "oldest" : "newest");
    setPage(1);
  }

  function handleReset() {
    setSearchInput("");
    setLocation(null);
    setSort("newest");
    setPage(1);
  }

  const resultLabel = `${result.totalMatches} ${result.totalMatches === 1 ? "job" : "jobs"} found`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple/40 to-brand-indigo/20">
            <Briefcase size={18} className="text-brand-purple-light" />
          </div>
          <h1 className="text-2xl font-bold text-white">Browse Jobs</h1>
        </div>
        <p className="text-sm text-white/40">
          Explore published roles from recruiters and apply in a couple of clicks.
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <Card variant="flat" aria-label="Browse jobs controls" className="space-y-4 border-white/10 bg-white/[0.025]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_auto]">
            {/* Search (server-side, debounced by the hook) */}
            <div className="min-w-0">
              <label
                htmlFor="browse-jobs-search"
                className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45"
              >
                Search
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  id="browse-jobs-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Title, company, or location"
                  aria-describedby="browse-jobs-result-count"
                  className={`${CONTROL_CLASS_NAME} pl-9`}
                />
              </div>
            </div>

            {/* Location filter (client-side, derived from loaded jobs) */}
            <div className="min-w-0">
              <label
                htmlFor="browse-jobs-location"
                className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45"
              >
                Location
              </label>
              <div className="relative">
                <ListFilter
                  aria-hidden="true"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <select
                  id="browse-jobs-location"
                  value={location ?? ""}
                  onChange={(event) => handleLocationChange(event.target.value)}
                  className={`${CONTROL_CLASS_NAME} appearance-none pl-9`}
                >
                  <option value="">All locations</option>
                  {result.locationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort (client-side) */}
            <div className="min-w-0">
              <label
                htmlFor="browse-jobs-sort"
                className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45"
              >
                Sort by
              </label>
              <select
                id="browse-jobs-sort"
                value={sort}
                onChange={(event) => handleSortChange(event.target.value)}
                className={CONTROL_CLASS_NAME}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleReset}
                disabled={!hasActiveControls}
                aria-label="Reset search, location filter, and sorting"
                className="w-full sm:w-auto"
              >
                <RotateCcw aria-hidden="true" size={15} strokeWidth={2} />
                Reset
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p id="browse-jobs-result-count" role="status" aria-live="polite" className="text-sm text-white/55">
              {isInitialLoading ? "Loading jobs\u2026" : resultLabel}
              {isRefreshing ? <span className="ml-2 text-white/35">Updating\u2026</span> : null}
            </p>

            {result.totalMatches > 0 ? (
              <nav aria-label="Jobs pagination" className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(Math.max(1, result.page - 1))}
                  disabled={result.page <= 1}
                  aria-label="Go to previous page"
                >
                  <ChevronLeft aria-hidden="true" size={15} strokeWidth={2} />
                  Previous
                </Button>
                <span aria-live="polite" className="min-w-28 text-center text-xs font-medium text-white/65">
                  Page {result.page} of {result.totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(Math.min(result.totalPages, result.page + 1))}
                  disabled={result.page >= result.totalPages}
                  aria-label="Go to next page"
                >
                  Next
                  <ChevronRight aria-hidden="true" size={15} strokeWidth={2} />
                </Button>
              </nav>
            ) : null}
          </div>
        </Card>
      </motion.div>

      {/* Body */}
      {isInitialLoading ? (
        <section role="status" aria-live="polite" aria-busy="true" aria-label="Loading jobs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SKELETON_KEYS.map((key) => (
              <JobCardSkeleton key={key} />
            ))}
          </div>
          <span className="sr-only">Loading jobs</span>
        </section>
      ) : showBlockingError ? (
        <ErrorPanel message={errorMessage} onRetry={reload} />
      ) : !hasJobs ? (
        <EmptyPanel
          variant={trimmedSearch.length > 0 ? "no-search-results" : "no-jobs"}
          searchTerm={trimmedSearch}
          onReset={handleReset}
          onRefresh={reload}
        />
      ) : result.totalMatches === 0 ? (
        <EmptyPanel variant="no-filter-matches" searchTerm={trimmedSearch} onReset={handleReset} onRefresh={reload} />
      ) : (
        <div className="space-y-4">
          {showInlineError ? (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-2xl border border-red-400/25 bg-red-500/[0.06] px-4 py-3 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle aria-hidden="true" size={15} className="shrink-0 text-red-300" />
                {errorMessage ?? "We couldn't refresh the latest jobs."}
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={reload} className="shrink-0">
                <RefreshCw aria-hidden="true" size={14} strokeWidth={2} />
                Retry
              </Button>
            </div>
          ) : null}

          <motion.ul
            key={`${result.page}-${sort}-${location ?? "all"}`}
            variants={gridContainer}
            initial="hidden"
            animate="visible"
            className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {result.visibleJobs.map((job) => (
              <motion.li key={job.id} variants={gridItem} className="min-w-0">
                <JobCard job={job} applied={appliedIds.has(job.id)} />
              </motion.li>
            ))}
          </motion.ul>
        </div>
      )}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <Card
      role="alert"
      aria-live="assertive"
      className="border-red-400/25 bg-red-500/[0.06] text-center"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center px-1 py-2 sm:px-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/25 bg-red-500/10 text-red-200">
          <AlertTriangle aria-hidden="true" size={22} strokeWidth={1.9} />
        </span>
        <h2 className="mt-5 text-lg font-semibold tracking-tight text-white">Couldn&apos;t load jobs</h2>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {message?.trim() || "Unable to load jobs right now. Please try again."}
        </p>
        <Button type="button" variant="secondary" onClick={onRetry} aria-label="Try loading jobs again" className="mt-6">
          <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />
          Try again
        </Button>
      </div>
    </Card>
  );
}

type EmptyVariant = "no-jobs" | "no-search-results" | "no-filter-matches";

function EmptyPanel({
  variant,
  searchTerm,
  onReset,
  onRefresh,
}: {
  variant: EmptyVariant;
  searchTerm: string;
  onReset: () => void;
  onRefresh: () => void;
}) {
  const copy = getEmptyCopy(variant, searchTerm);

  return (
    <Card
      role="status"
      aria-live="polite"
      className="border-dashed border-white/10 bg-white/[0.02] text-center"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center px-1 py-4 sm:px-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10 text-brand-purple-light">
          {variant === "no-jobs" ? (
            <Briefcase aria-hidden="true" size={23} strokeWidth={1.9} />
          ) : (
            <SearchX aria-hidden="true" size={23} strokeWidth={1.9} />
          )}
        </span>
        <h2 className="mt-5 text-lg font-semibold tracking-tight text-white">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">{copy.description}</p>

        <div className="mt-6">
          {variant === "no-jobs" ? (
            <Button type="button" variant="secondary" onClick={onRefresh} aria-label="Refresh the jobs list">
              <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />
              Refresh
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={onReset} aria-label="Clear search and filters">
              <RotateCcw aria-hidden="true" size={16} strokeWidth={2} />
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function getEmptyCopy(variant: EmptyVariant, searchTerm: string): { title: string; description: string } {
  switch (variant) {
    case "no-search-results":
      return {
        title: "No matching jobs",
        description: searchTerm
          ? `No published jobs match \u201C${searchTerm}\u201D. Try a different keyword or clear your search.`
          : "No published jobs match your search. Try a different keyword.",
      };
    case "no-filter-matches":
      return {
        title: "No jobs for this filter",
        description: "No loaded jobs match the selected location. Clear the filter to see everything again.",
      };
    case "no-jobs":
    default:
      return {
        title: "No open roles yet",
        description: "There are no published jobs right now. Check back soon \u2014 new roles appear here as recruiters post them.",
      };
  }
}
