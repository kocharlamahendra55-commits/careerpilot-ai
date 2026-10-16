"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  FileText,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertsList } from "@/components/recruiter/AlertsList";
import { CopilotPanel } from "@/components/recruiter/CopilotPanel";
import { HiringFunnel } from "@/components/recruiter/HiringFunnel";
import { KPIStatsCards } from "@/components/recruiter/KPIStatsCards";
import {
  RecentActivityTimeline,
  type RecruiterActivityItem,
} from "@/components/recruiter/RecentActivityTimeline";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardFunnel {
  applied: number;
  shortlisted: number;
  interview: number;
  offered: number;
  hired: number;
  rejected: number;
}

interface ApplicationsOverTimePoint {
  date: string;
  count: number;
}

interface DashboardAlert {
  type: "info" | "warning";
  message: string;
}

interface RecruiterDashboardPayload {
  activeJobs: number;
  newApplicationsThisWeek: number;
  funnel: DashboardFunnel;
  applicationsOverTime: ApplicationsOverTimePoint[];
  recentActivity: RecruiterActivityItem[];
  alerts: DashboardAlert[];
}

interface RecruiterCopilotPayload {
  brief: string;
  suggestion: string;
  _fallback?: boolean;
}

const DASHBOARD_ENDPOINT = "/api/recruiter/dashboard";
const COPILOT_ENDPOINT = "/api/recruiter/copilot";

const EMPTY_FUNNEL: DashboardFunnel = {
  applied: 0,
  shortlisted: 0,
  interview: 0,
  offered: 0,
  hired: 0,
  rejected: 0,
};

const EMPTY_DASHBOARD: RecruiterDashboardPayload = {
  activeJobs: 0,
  newApplicationsThisWeek: 0,
  funnel: EMPTY_FUNNEL,
  applicationsOverTime: [],
  recentActivity: [],
  alerts: [],
};

const JOB_ACTIVITY_ACTIONS = new Set([
  "JOB_POSTED",
  "JOB_PUBLISHED",
  "JOB_ARCHIVED",
  "JOB_UPDATED",
]);

const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string): boolean {
  return value.length > 0 && !Number.isNaN(Date.parse(value));
}

function normalizeFunnel(value: unknown): DashboardFunnel {
  const funnel = isRecord(value) ? value : {};

  return {
    applied: asCount(funnel.applied),
    shortlisted: asCount(funnel.shortlisted),
    interview: asCount(funnel.interview),
    offered: asCount(funnel.offered),
    hired: asCount(funnel.hired),
    rejected: asCount(funnel.rejected),
  };
}

function normalizeApplicationsOverTime(value: unknown): ApplicationsOverTimePoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const date = asText(item.date);
    if (!isValidDate(date)) {
      return [];
    }

    return [{ date, count: asCount(item.count) }];
  });
}

function normalizeRecentActivity(value: unknown): RecruiterActivityItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const type = asText(item.type);
    const action = asText(item.action);
    const createdAt = asText(item.createdAt);

    if (!type || !action || !isValidDate(createdAt)) {
      return [];
    }

    return [
      {
        type,
        action,
        description: asText(item.description),
        createdAt,
      },
    ];
  });
}

function normalizeAlerts(value: unknown): DashboardAlert[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const type = item.type;
    const message = asText(item.message);
    if ((type !== "info" && type !== "warning") || !message) {
      return [];
    }

    return [{ type, message }];
  });
}

function normalizeDashboardPayload(value: unknown): RecruiterDashboardPayload {
  const dashboard = isRecord(value) ? value : {};

  return {
    activeJobs: asCount(dashboard.activeJobs),
    newApplicationsThisWeek: asCount(dashboard.newApplicationsThisWeek),
    funnel: normalizeFunnel(dashboard.funnel),
    applicationsOverTime: normalizeApplicationsOverTime(
      dashboard.applicationsOverTime
    ),
    recentActivity: normalizeRecentActivity(dashboard.recentActivity),
    alerts: normalizeAlerts(dashboard.alerts),
  };
}

function normalizeCopilotPayload(value: unknown): RecruiterCopilotPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const brief = asText(value.brief);
  const suggestion = asText(value.suggestion);

  if (!brief || !suggestion) {
    return null;
  }

  return {
    brief,
    suggestion,
    ...(typeof value._fallback === "boolean"
      ? { _fallback: value._fallback }
      : {}),
  };
}

function formatMetric(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildHiringSummary(data: RecruiterDashboardPayload): string {
  return `Today: ${formatMetric(data.activeJobs, "active job")}, ${formatMetric(
    data.newApplicationsThisWeek,
    "new application"
  )} this week, and ${formatMetric(
    data.funnel.shortlisted,
    "shortlisted candidate"
  )}.`;
}

function buildCopilotFallback(
  data: RecruiterDashboardPayload
): RecruiterCopilotPayload {
  const { activeJobs, newApplicationsThisWeek, funnel } = data;
  let suggestion = "When you publish a role, new applications and hiring activity will appear here.";

  if (funnel.shortlisted > 0) {
    suggestion = `Review ${formatMetric(
      funnel.shortlisted,
      "shortlisted candidate"
    )} to keep the hiring process moving.`;
  } else if (newApplicationsThisWeek > 0) {
    suggestion = "Review this week's new applications to identify candidates to shortlist.";
  } else if (activeJobs > 0) {
    suggestion = "Keep your active roles visible and review applications as they arrive.";
  }

  return {
    brief: `You have ${formatMetric(activeJobs, "active job")}, ${formatMetric(
      newApplicationsThisWeek,
      "new application"
    )} this week, and ${formatMetric(
      funnel.shortlisted,
      "shortlisted candidate"
    )}.`,
    suggestion,
    _fallback: true,
  };
}

function getApplicationsTrend(
  points: ApplicationsOverTimePoint[]
): { value: number; label: string } | undefined {
  const chronologicalPoints = [...points].sort(
    (left, right) => Date.parse(left.date) - Date.parse(right.date)
  );
  const previousPeriodSize = Math.floor(chronologicalPoints.length / 2);

  if (previousPeriodSize === 0) {
    return undefined;
  }

  const previousPeriod = chronologicalPoints.slice(0, previousPeriodSize);
  const recentPeriod = chronologicalPoints.slice(previousPeriodSize);
  const previousAverage =
    previousPeriod.reduce((total, point) => total + point.count, 0) /
    previousPeriod.length;
  const recentAverage =
    recentPeriod.reduce((total, point) => total + point.count, 0) /
    recentPeriod.length;

  if (previousAverage <= 0) {
    return undefined;
  }

  const percentageChange = Math.round(
    ((recentAverage - previousAverage) / previousAverage) * 100
  );

  return percentageChange === 0
    ? undefined
    : { value: percentageChange, label: "vs prior period" };
}

function formatChartDate(date: string): string {
  return chartDateFormatter.format(new Date(date));
}

function getRecruiterName(
  profile: Record<string, string> | null | undefined,
  name: string | undefined
): string {
  return profile?.recruiterName?.trim() || name?.trim() || "Recruiter";
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function DashboardBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-36 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-brand-purple/10 blur-3xl" />
      <div className="absolute top-72 -right-28 h-64 w-64 rounded-full bg-brand-cyan/10 blur-3xl" />
      <div className="absolute bottom-12 -left-28 h-72 w-72 rounded-full bg-brand-indigo/10 blur-3xl" />
    </div>
  );
}

function DashboardShellSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading recruiter dashboard"
      className="relative min-h-screen overflow-hidden bg-[#050816] px-4 py-6 sm:px-6 lg:px-8"
    >
      <DashboardBackdrop />
      <div className="relative mx-auto max-w-7xl space-y-8 lg:space-y-10">
        <div className="space-y-3 pt-2">
          <div className="skeleton h-8 w-56 max-w-full" />
          <div className="skeleton h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} variant="stat" aria-hidden="true">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-9 w-16" />
                  <div className="skeleton h-3 w-36" />
                </div>
                <div className="skeleton h-10 w-10 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="h-72 xl:col-span-2" aria-hidden="true">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton mt-8 h-44 w-full" />
          </Card>
          <Card className="h-72" aria-hidden="true">
            <div className="skeleton h-5 w-32" />
            <div className="mt-7 space-y-3">
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
            </div>
          </Card>
        </div>
      </div>
      <span className="sr-only">Loading recruiter dashboard</span>
    </main>
  );
}

function DashboardLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[#050816] px-4 py-10 sm:px-6 lg:px-8">
      <DashboardBackdrop />
      <Card
        role="alert"
        aria-live="assertive"
        className="relative mx-auto w-full max-w-xl border-red-400/20 bg-red-500/[0.06] text-center"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/10 text-red-200">
          <RefreshCw aria-hidden="true" size={21} strokeWidth={1.9} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-white">
          Your hiring dashboard could not be loaded
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">
          Check your connection and try loading the latest hiring information again.
        </p>
        <Button
          type="button"
          onClick={onRetry}
          className="mt-6"
          aria-label="Retry loading the recruiter dashboard"
        >
          <RefreshCw aria-hidden="true" size={15} strokeWidth={2} />
          Reload dashboard
        </Button>
      </Card>
    </main>
  );
}

export default function RecruiterDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const requestIdRef = useRef(0);
  const [dashboard, setDashboard] = useState<RecruiterDashboardPayload | null>(
    null
  );
  const [copilot, setCopilot] = useState<RecruiterCopilotPayload | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isCopilotLoading, setIsCopilotLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const isCurrentRequest = () => requestIdRef.current === requestId;

    setDashboardError(null);
    setDashboard(null);
    setCopilot(null);
    setIsDashboardLoading(true);
    setIsCopilotLoading(true);

    const dashboardRequest = fetch(DASHBOARD_ENDPOINT);
    const copilotRequest = fetch(COPILOT_ENDPOINT);
    void copilotRequest.catch(() => undefined);

    let dashboardData: RecruiterDashboardPayload;

    try {
      const dashboardResponse = await dashboardRequest;
      if (!dashboardResponse.ok) {
        throw new Error("Dashboard request failed");
      }

      dashboardData = normalizeDashboardPayload(
        await readJsonSafely(dashboardResponse)
      );
    } catch {
      if (isCurrentRequest()) {
        setDashboardError("Unable to load dashboard data.");
        setIsDashboardLoading(false);
        setIsCopilotLoading(false);
      }
      return;
    }

    if (!isCurrentRequest()) {
      return;
    }

    setDashboard(dashboardData);
    setIsDashboardLoading(false);

    try {
      const copilotResponse = await copilotRequest;
      if (!copilotResponse.ok) {
        throw new Error("Copilot request failed");
      }

      const copilotData = normalizeCopilotPayload(
        await readJsonSafely(copilotResponse)
      );

      if (isCurrentRequest()) {
        setCopilot(copilotData ?? buildCopilotFallback(dashboardData));
      }
    } catch {
      if (isCurrentRequest()) {
        setCopilot(buildCopilotFallback(dashboardData));
      }
    } finally {
      if (isCurrentRequest()) {
        setIsCopilotLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user]);  // Fixed: removed router from deps

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    void loadDashboard();

    return () => {
      requestIdRef.current += 1;
    };
  }, [authLoading, loadDashboard, user]);

  const dashboardData = dashboard ?? EMPTY_DASHBOARD;
  const recruiterName = getRecruiterName(user?.profile, user?.name);
  const hiringSummary = dashboard
    ? buildHiringSummary(dashboard)
    : "Loading today's hiring summary.";
  const applicationsTrend = dashboard
    ? getApplicationsTrend(dashboard.applicationsOverTime)
    : undefined;
  const chartData = useMemo(
    () =>
      [...dashboardData.applicationsOverTime]
        .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
        .map((point) => ({
          date: formatChartDate(point.date),
          count: point.count,
        })),
    [dashboardData.applicationsOverTime]
  );
  const hasApplicationTrendData = chartData.some((point) => point.count > 0);
  const jobActivity = dashboardData.recentActivity.filter((activity) =>
    JOB_ACTIVITY_ACTIONS.has(activity.action.trim().toUpperCase())
  );
  const copilotData = copilot ?? buildCopilotFallback(dashboardData);
  const contentLoading = isDashboardLoading || isCopilotLoading;

  if (authLoading) {
    return <DashboardShellSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (dashboardError) {
    return <DashboardLoadError onRetry={() => void loadDashboard()} />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] px-4 py-6 sm:px-6 lg:px-8">
      <DashboardBackdrop />
      <div className="relative mx-auto max-w-7xl space-y-8 lg:space-y-10">
        <motion.header
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.35,
            ease: "easeOut",
          }}
          className="flex flex-col gap-3 pt-1 sm:pt-2"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan-light/80">
              Recruiter workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-[30px]">
              Welcome back, {recruiterName}
            </h1>
          </div>
          {isDashboardLoading ? (
            <div aria-busy="true" className="space-y-2">
              <div className="skeleton h-4 w-full max-w-xl" />
              <div className="skeleton h-4 w-3/4 max-w-sm" />
              <span className="sr-only">Loading today&apos;s hiring summary</span>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-white/60">Today&apos;s hiring summary</p>
              <p
                aria-label={`Today's hiring summary: ${hiringSummary}`}
                className="mt-1 text-sm leading-6 text-white/75"
              >
                {hiringSummary}
              </p>
            </div>
          )}
        </motion.header>

        <motion.section
          aria-labelledby="hiring-overview-heading"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.35,
            delay: shouldReduceMotion ? 0 : 0.05,
            ease: "easeOut",
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2
                id="hiring-overview-heading"
                className="text-base font-semibold text-white/90 sm:text-lg"
              >
                Hiring overview
              </h2>
              <p className="mt-1 text-sm text-white/45">
                A live view of the current hiring pipeline.
              </p>
            </div>
            <Badge variant="cyan" className="shrink-0">
              Today
            </Badge>
          </div>
          <KPIStatsCards
            loading={isDashboardLoading}
            data={{
              activeJobs: dashboardData.activeJobs,
              draftJobs: null,
              funnel: dashboardData.funnel,
              ...(applicationsTrend ? { applicationsTrend } : {}),
            }}
          />
        </motion.section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <motion.section
            aria-labelledby="applications-trend-heading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.38,
              delay: shouldReduceMotion ? 0 : 0.1,
              ease: "easeOut",
            }}
            className="xl:col-span-2"
          >
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle
                    id="applications-trend-heading"
                    className="flex items-center gap-2"
                  >
                    <TrendingUp
                      aria-hidden="true"
                      size={17}
                      className="text-brand-purple-light"
                    />
                    Applications Trend
                  </CardTitle>
                  <CardDescription>
                    Applications received over the reported period
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isDashboardLoading ? (
                  <div
                    aria-busy="true"
                    aria-label="Loading applications trend"
                    className="space-y-5 py-3"
                  >
                    <div className="skeleton h-4 w-36" />
                    <div className="skeleton h-52 w-full rounded-xl" />
                  </div>
                ) : hasApplicationTrendData ? (
                  <div
                    aria-label="Applications received over time"
                    className="h-[240px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="recruiterApplicationsGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          dataKey="date"
                          stroke="#ffffff30"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={24}
                        />
                        <YAxis
                          allowDecimals={false}
                          stroke="#ffffff30"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#0d0d1a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                          }}
                          labelStyle={{ color: "#ffffff60" }}
                          itemStyle={{ color: "#a78bfa" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Applications"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fill="url(#recruiterApplicationsGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-purple/20 bg-brand-purple/10 text-brand-purple-light">
                      <BarChart3 aria-hidden="true" size={21} />
                    </span>
                    <h3 className="mt-4 text-sm font-semibold text-white/90">
                      No application trend yet
                    </h3>
                    <p className="mt-1 max-w-sm text-sm leading-5 text-white/55">
                      Application activity will appear here as candidates apply to your roles.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            aria-labelledby="hiring-funnel-heading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.38,
              delay: shouldReduceMotion ? 0 : 0.14,
              ease: "easeOut",
            }}
          >
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle
                    id="hiring-funnel-heading"
                    className="flex items-center gap-2"
                  >
                    <Briefcase
                      aria-hidden="true"
                      size={17}
                      className="text-brand-cyan-light"
                    />
                    Hiring Funnel
                  </CardTitle>
                  <CardDescription>
                    Candidate progress across tracked stages
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <HiringFunnel
                  funnel={dashboardData.funnel}
                  loading={isDashboardLoading}
                />
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            aria-label="AI Recruiter Copilot"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.38,
              delay: shouldReduceMotion ? 0 : 0.18,
              ease: "easeOut",
            }}
            className="xl:col-span-2"
          >
            <CopilotPanel
              brief={copilotData.brief}
              suggestion={copilotData.suggestion}
              fallback={copilotData._fallback}
              loading={contentLoading}
            />
          </motion.section>

          <motion.section
            aria-labelledby="ai-alerts-heading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.38,
              delay: shouldReduceMotion ? 0 : 0.22,
              ease: "easeOut",
            }}
          >
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle
                    id="ai-alerts-heading"
                    className="flex items-center gap-2"
                  >
                    <Bell
                      aria-hidden="true"
                      size={17}
                      className="text-amber-300"
                    />
                    AI Alerts
                  </CardTitle>
                  <CardDescription>
                    Timely signals from your hiring activity
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isDashboardLoading ? (
                  <div aria-busy="true" className="space-y-3">
                    <div className="skeleton h-16 w-full rounded-xl" />
                    <div className="skeleton h-16 w-full rounded-xl" />
                  </div>
                ) : (
                  <AlertsList alerts={dashboardData.alerts} />
                )}
              </CardContent>
            </Card>
          </motion.section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.section
            aria-labelledby="recent-activity-heading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.38,
              delay: shouldReduceMotion ? 0 : 0.26,
              ease: "easeOut",
            }}
            className="lg:col-span-2"
          >
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle
                    id="recent-activity-heading"
                    className="flex items-center gap-2"
                  >
                    <Activity
                      aria-hidden="true"
                      size={17}
                      className="text-brand-cyan-light"
                    />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    The latest hiring and application updates
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <RecentActivityTimeline
                  activities={dashboardData.recentActivity}
                  loading={isDashboardLoading}
                />
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            aria-labelledby="recent-jobs-heading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.38,
              delay: shouldReduceMotion ? 0 : 0.3,
              ease: "easeOut",
            }}
          >
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle
                    id="recent-jobs-heading"
                    className="flex items-center gap-2"
                  >
                    <Briefcase
                      aria-hidden="true"
                      size={17}
                      className="text-brand-purple-light"
                    />
                    Recent Jobs
                  </CardTitle>
                  <CardDescription>Latest job posting activity</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <RecentActivityTimeline
                  activities={jobActivity}
                  loading={isDashboardLoading}
                  compact
                  limit={5}
                  emptyTitle="No recent job activity"
                  emptyDescription="Job publishing and updates will appear here."
                />
              </CardContent>
            </Card>
          </motion.section>

          <motion.section
            aria-labelledby="quick-actions-heading"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.38,
              delay: shouldReduceMotion ? 0 : 0.34,
              ease: "easeOut",
            }}
            className="lg:col-span-3"
          >
            <Card className="bg-gradient-to-r from-white/[0.035] to-brand-purple/[0.055]">
              <CardHeader className="items-start gap-4 sm:items-center">
                <div>
                  <CardTitle
                    id="quick-actions-heading"
                    className="flex items-center gap-2"
                  >
                    <Zap
                      aria-hidden="true"
                      size={17}
                      className="text-amber-300"
                    />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Hiring workflow modules will be available here soon.
                  </CardDescription>
                </div>
                <Badge variant="purple" className="shrink-0">
                  <Sparkles aria-hidden="true" size={12} />
                  Coming next
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Create Job", icon: Plus },
                    { label: "View Applications", icon: FileText },
                    { label: "Manage Jobs", icon: Briefcase },
                    { label: "Analytics", icon: BarChart3 },
                  ].map(({ label, icon: Icon }) => (
                    <Button
                      key={label}
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled
                      aria-label={`${label} is coming next and is currently unavailable`}
                      title={`${label} is coming next`}
                      className="justify-start px-4"
                    >
                      <Icon aria-hidden="true" size={15} />
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

