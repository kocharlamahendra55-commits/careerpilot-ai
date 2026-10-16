"use client";

import { useId, type ReactNode } from "react";
import { Gauge, Lightbulb, ListChecks, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";
import type {
  CandidateProfileAnalysisSection,
  ProfileListValue,
  ProfileScoreValue,
  ProfileTextValue,
} from "@/features/recruiter-workspace/candidate-profile-projection";

export interface AnalysisSectionProps {
  /** The source-backed analysis projection for this application. */
  analysis: CandidateProfileAnalysisSection;
  className?: string;
}

interface SubScoreDescriptor {
  readonly key: keyof Pick<
    CandidateProfileAnalysisSection,
    | "formattingScore"
    | "impactVerbScore"
    | "skillsMatchScore"
    | "experienceScore"
    | "educationScore"
  >;
  readonly label: string;
}

const SUB_SCORES: readonly SubScoreDescriptor[] = [
  { key: "formattingScore", label: "Formatting" },
  { key: "impactVerbScore", label: "Impact verbs" },
  { key: "skillsMatchScore", label: "Skills match" },
  { key: "experienceScore", label: "Experience" },
  { key: "educationScore", label: "Education" },
] as const;

/**
 * Renders the source-backed résumé analysis. Every value is projected
 * independently, so a single absent field shows its own unavailability marker
 * rather than a fabricated zero or empty list. A genuine returned 0 is shown.
 */
export function AnalysisSection({ analysis, className }: AnalysisSectionProps) {
  const headingId = useId();

  return (
    <Card
      aria-labelledby={headingId}
      className={cn("space-y-6 motion-reduce:transition-none", className)}
    >
      <div className="flex items-center gap-2.5">
        <Sparkles aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-brand-purple-light" />
        <h2 id={headingId} className="text-base font-semibold tracking-tight text-white">
          Resume analysis
        </h2>
      </div>

      {!analysis.present ? (
        <UnavailabilityIndicator message="No résumé analysis was returned for this application." />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">ATS score</span>
        {analysis.atsScore.available ? (
          <span className="inline-flex items-baseline gap-1 rounded-lg border border-brand-purple/30 bg-brand-purple/10 px-3 py-1.5">
            <Gauge aria-hidden="true" size={16} strokeWidth={2} className="self-center text-brand-purple-light" />
            <span className="text-lg font-bold tabular-nums text-white">{analysis.atsScore.score}</span>
          </span>
        ) : (
          <UnavailabilityIndicator message="No ATS score was returned for this application." />
        )}
      </div>

      <AnalysisField label="Summary">
        {renderText(analysis.summary, "No résumé summary was returned for this application.")}
      </AnalysisField>

      <div className="grid gap-6 md:grid-cols-2">
        <AnalysisField label="Strengths" icon={<ListChecks aria-hidden="true" size={15} strokeWidth={2} className="text-emerald-300/90" />}>
          {renderList(analysis.strengths, "No strengths were returned for this application.")}
        </AnalysisField>
        <AnalysisField label="Weaknesses" icon={<TrendingUp aria-hidden="true" size={15} strokeWidth={2} className="text-amber-200/90" />}>
          {renderList(analysis.weaknesses, "No weaknesses were returned for this application.")}
        </AnalysisField>
        <AnalysisField label="Skills">
          {renderList(analysis.hiddenSkills, "No skills were returned for this application.")}
        </AnalysisField>
        <AnalysisField label="Keyword suggestions" icon={<Lightbulb aria-hidden="true" size={15} strokeWidth={2} className="text-brand-cyan-light" />}>
          {renderList(analysis.keywordSuggestions, "No keyword suggestions were returned for this application.")}
        </AnalysisField>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">Sub-scores</p>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUB_SCORES.map(({ key, label }) => {
            const value = analysis[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
              >
                <dt className="text-xs font-medium text-white/50">{label}</dt>
                <dd className="mt-1.5 min-w-0">
                  {renderScore(
                    value,
                    `No ${label.toLowerCase()} score was returned for this application.`
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </Card>
  );
}

function AnalysisField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white/40">
        {icon}
        {label}
      </p>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}

function renderText(value: ProfileTextValue, unavailableMessage: string): ReactNode {
  if (!value.available) {
    return <UnavailabilityIndicator message={unavailableMessage} />;
  }

  return <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/75">{value.text}</p>;
}

function renderList(value: ProfileListValue, unavailableMessage: string): ReactNode {
  if (!value.available) {
    return <UnavailabilityIndicator message={unavailableMessage} />;
  }

  return (
    <ul className="space-y-1.5">
      {value.items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-6 text-white/75">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-purple-light/70" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function renderScore(value: ProfileScoreValue, unavailableMessage: string): ReactNode {
  if (!value.available) {
    return <UnavailabilityIndicator message={unavailableMessage} />;
  }

  return <span className="text-lg font-semibold tabular-nums text-white">{value.score}</span>;
}
