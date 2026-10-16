/**
 * SSR-safe, session-scoped store of "applied" job IDs for the Student Jobs
 * experience, backed by `sessionStorage`.
 *
 * IMPORTANT SCOPE NOTE:
 * There is no student "list my applications" API. This store therefore only
 * knows about jobs the student applied to (or opened) during the CURRENT browser
 * session. Browse can render an "Applied" badge best-effort from this store, but
 * it CANNOT reflect applications made in prior sessions or on other devices.
 * The Job Details page (Part 2) reads the authoritative per-job application
 * state from the server and is the source of truth; this store is a UX hint only.
 *
 * Part 1 only reads from the store. Part 2 will call `markJobApplied` after a
 * successful apply so the badge appears immediately without a page reload.
 *
 * Every function guards `typeof window` so it is safe to import and call from
 * components that may render on the server.
 */

const APPLIED_JOBS_STORAGE_KEY = "careerpilot:student-jobs:applied";

/**
 * Same-tab change signal. The native `storage` event only fires in OTHER tabs,
 * so an in-tab custom event is dispatched to let the current tab re-render.
 */
const APPLIED_JOBS_CHANGE_EVENT = "careerpilot:student-jobs:applied-change";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readStorage(): Set<string> {
  if (!hasWindow()) {
    return new Set<string>();
  }

  try {
    const raw = window.sessionStorage.getItem(APPLIED_JOBS_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    const ids = parsed.filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );
    return new Set<string>(ids);
  } catch {
    // Corrupt or inaccessible storage is treated as "nothing applied yet".
    return new Set<string>();
  }
}

/** Returns a fresh Set of applied job IDs known in this session (empty on the server). */
export function getAppliedJobIds(): Set<string> {
  return readStorage();
}

/** Best-effort check whether a job was applied to (or marked) in this session. */
export function isJobApplied(jobId: string): boolean {
  if (!hasWindow() || typeof jobId !== "string" || jobId.length === 0) {
    return false;
  }
  return readStorage().has(jobId);
}

/**
 * Records a job as applied for this session and notifies same-tab subscribers.
 * No-ops on the server, for invalid IDs, or if the ID is already recorded.
 */
export function markJobApplied(jobId: string): void {
  if (!hasWindow() || typeof jobId !== "string" || jobId.trim().length === 0) {
    return;
  }

  const id = jobId.trim();
  const ids = readStorage();
  if (ids.has(id)) {
    return;
  }

  ids.add(id);

  try {
    window.sessionStorage.setItem(APPLIED_JOBS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // If persistence fails (quota/private mode) there is nothing else to do.
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(APPLIED_JOBS_CHANGE_EVENT));
  } catch {
    // Environments without CustomEvent simply skip the in-tab notification.
  }
}

/**
 * Subscribes to applied-set changes from this tab (via `markJobApplied`) and
 * other tabs (via the native `storage` event). Returns an unsubscribe function.
 * Returns a no-op unsubscribe on the server.
 */
export function subscribeAppliedJobs(listener: () => void): () => void {
  if (!hasWindow()) {
    return () => {};
  }

  const handleChange = () => listener();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === APPLIED_JOBS_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(APPLIED_JOBS_CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(APPLIED_JOBS_CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}
