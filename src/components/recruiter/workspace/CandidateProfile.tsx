"use client";

import { useEffect, useId, useState } from "react";
import { Briefcase, CalendarDays, CircleUserRound, FolderKanban, History, Route } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { AnalysisSection } from "./AnalysisSection";
import { ApplicationStatusActions } from "./ApplicationStatusActions";
import { ApplicationTimeline } from "./ApplicationTimeline";
import { EducationSection } from "./EducationSection";
import { NotesPlaceholder } from "./NotesPlaceholder";
import { ResumeSection } from "./ResumeSection";
import { StatusBadge } from "./StatusBadge";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";
import type {
  CandidateProfileProjection,
  CandidateProfileUnavailableSection,
} from "@/features/recruiter-workspace/candidate-profile-projection";

export interface CandidateProfileProps {
  /** The fully projected, source-backed candidate profile. */
  profile: CandidateProfileProjection;
  className?: string;
}

function formatAppliedDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

/**
 * Composes the source-backed candidate profile sections for a single
 * application. Every rendered value comes from the passed projection; absent
 * source data and integration-gated (D4) sections render explicit unavailable
 * markers, never fabricated content. This surface performs no requests and no
 * status mutations.
 */
export function CandidateProfile({ profile, className }: CandidateProfileProps) {
  const summaryHeadingId = useId();
  const unavailableHeadingId = useId();

  const { identity, unavailableSections } = profile;
  const candidateLabel = identity.candidate.available ? identity.candidate.text : "";
  const sourceStatus = identity.status.available ? identity.status.text : "";

  // Track the current status locally so a successful in-place update reflects
  // immediately in this header badge and the actions card. Re-seed whenever a
  // different application is shown or the source status itself changes.
  const [currentStatus, setCurrentStatus] = useState(sourceStatus);

  useEffect(() => {
    setCurrentStatus(sourceStatus);
  }, [profile.applicationId, sourceStatus]);

  const d4Sections: ReadonlyArray<{
    readonly section: CandidateProfileUnavailableSection;
    readonly label: string;
    readonly description: string;
    readonly Icon: typeof FolderKanban;
  }> = [
    {
      section: unavailableSections.projects,
      label: "Projects",
      description: "Structured candidate projects are not exposed by the current application service.",
      Icon: FolderKanban,
    },
    {
      section: unavailableSections.additionalExperience,
      label: "Additional work experience",
      description: "Additional work experience is not exposed by the current application service.",
      Icon: Briefcase,
    },
    {
      section: unavailableSections.roadmap,
      label: "Career roadmap",
      description: "A candidate career roadmap is not exposed by the current application service.",
      Icon: Route,
    },
    {
      section: unavailableSections.statusHistory,
      label: "Extended status history",
      description: "Extended application status history is not exposed by the current application service.",
      Icon: History,
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <Card aria-labelledby={summaryHeadingId} className="space-y-5 motion-reduce:transition-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10 text-brand-purple-light">
              <CircleUserRound aria-hidden="true" size={22} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              {identity.candidate.available ? (
                <h2 id={summaryHeadingId} className="break-words text-xl font-bold tracking-tight text-white">
                  {identity.candidate.text}
                </h2>
              ) : (
                <div>
                  <h2 id={summaryHeadingId} className="sr-only">
                    Candidate
                  </h2>
                  <UnavailabilityIndicator message="No candidate name or email was returned for this application." />
                </div>
              )}

              <div className="mt-2 flex items-center gap-1.5 text-sm text-white/60">
                <Briefcase aria-hidden="true" size={15} strokeWidth={2} className="shrink-0 text-white/40" />
                {identity.jobTitle.available ? (
                  <span className="min-w-0 break-words">{identity.jobTitle.text}</span>
                ) : (
                  <UnavailabilityIndicator message="No job title was returned for this application." />
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            {currentStatus.trim() ? (
              <StatusBadge status={currentStatus} />
            ) : (
              <UnavailabilityIndicator message="No application status was returned for this application." />
            )}
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <CalendarDays aria-hidden="true" size={14} strokeWidth={2} className="shrink-0 text-white/40" />
              <span>Applied</span>
              {identity.appliedDate.available ? (
                <time dateTime={identity.appliedDate.iso} className="text-white/70">
                  {formatAppliedDate(identity.appliedDate.timestamp)}
                </time>
              ) : (
                <UnavailabilityIndicator message="No application date was returned for this application." />
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <AnalysisSection analysis={profile.analysis} />
          <ResumeSection resume={profile.resume} />
          <EducationSection education={profile.education} />
        </div>

        <div className="min-w-0 space-y-6">
          <ApplicationStatusActions
            status={currentStatus}
            candidateLabel={candidateLabel}
            applicationId={profile.applicationId}
            onStatusUpdated={(newStatus) => setCurrentStatus(newStatus)}
          />
          <ApplicationTimeline timeline={profile.timeline} />

          <Card aria-labelledby={unavailableHeadingId} className="space-y-4 motion-reduce:transition-none">
            <h2 id={unavailableHeadingId} className="text-base font-semibold tracking-tight text-white">
              Not available yet
            </h2>
            <p className="text-sm leading-6 text-white/55">
              These sections depend on data the current application service does not expose. They are shown as
              explicitly unavailable rather than fabricated.
            </p>
            <ul className="space-y-3">
              {d4Sections.map(({ section, label, description, Icon }) => (
                <li key={section.section} className="flex items-start gap-2.5">
                  <Icon aria-hidden="true" size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-white/40" />
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-medium text-white/75">{label}</p>
                    <UnavailabilityIndicator dependency={section.dependency} message={description} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <NotesPlaceholder />
        </div>
      </div>
    </div>
  );
}
