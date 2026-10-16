"use client";

import type { ReactNode } from "react";
import { BriefcaseBusiness, FileText, MapPin, ReceiptText, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { type JobFormState } from "@/features/recruiter-workspace/job-form";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";
import { StatusBadge } from "./StatusBadge";

export interface JobPreviewProps {
  form: JobFormState;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Safe visual preview for the plain-text, Markdown-like job composer. It uses
 * React text nodes exclusively—never stored HTML or dangerouslySetInnerHTML.
 */
export function JobPreview({
  form,
  title = "Posting preview",
  description = "Review how the current form reads. Local-only fields are labelled as draft context.",
  className,
}: JobPreviewProps) {
  const hasLocalContext = Boolean(
    form.employmentType.trim() ||
      form.experience.trim() ||
      form.benefits.trim() ||
      form.workArrangement.trim()
  );

  return (
    <Card className={className}>
      <CardHeader className="items-start gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <FileText aria-hidden="true" size={17} className="text-brand-cyan-light" />
            {title}
          </CardTitle>
          <p className="mt-1.5 text-sm leading-6 text-white/50">{description}</p>
        </div>
        <StatusBadge status={form.status} className="ml-auto shrink-0" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <h3 className="break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {form.title.trim() || "Untitled job"}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <BriefcaseBusiness aria-hidden="true" size={15} className="text-brand-cyan-light" />
              {form.companyDisplay ? (
                form.companyDisplay
              ) : (
                <span className="text-white/45">Company profile unavailable</span>
              )}
            </span>
            {form.location.trim() ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden="true" size={15} className="text-brand-purple-light" />
                {form.location}
              </span>
            ) : null}
            {form.salary.trim() ? (
              <span className="inline-flex items-center gap-1.5">
                <Wallet aria-hidden="true" size={15} className="text-emerald-300" />
                {form.salary}
              </span>
            ) : null}
          </div>
        </div>

        {form.companyDisplay ? null : (
          <UnavailabilityIndicator
            message="Company display is unavailable until the recruiter profile or source job supplies it."
            dependency="D2"
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewValue label="Location" value={form.location} />
          <PreviewValue label="Salary" value={form.salary} />
        </div>

        <section aria-labelledby="preview-skills-heading">
          <h4 id="preview-skills-heading" className="text-sm font-semibold text-white/85">
            Required skills
          </h4>
          {form.requiredSkills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.requiredSkills.map((skill) => (
                <Badge key={skill} variant="cyan">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/45">No required skills added yet.</p>
          )}
        </section>

        <section aria-labelledby="preview-description-heading">
          <h4 id="preview-description-heading" className="text-sm font-semibold text-white/85">
            Description
          </h4>
          <div className="mt-2 rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm leading-6 text-white/75">
            {renderPlainTextDescription(form.description)}
          </div>
        </section>

        {hasLocalContext ? (
          <section aria-labelledby="preview-local-context-heading">
            <div className="flex items-center gap-2">
              <ReceiptText aria-hidden="true" size={16} className="text-amber-200" />
              <h4 id="preview-local-context-heading" className="text-sm font-semibold text-amber-100">
                Local draft context
              </h4>
              <Badge variant="yellow">Not persisted</Badge>
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <PreviewValue label="Employment type" value={form.employmentType} localOnly />
              <PreviewValue label="Experience" value={form.experience} localOnly />
              <PreviewValue label="Work arrangement" value={form.workArrangement} localOnly />
              <PreviewValue label="Benefits" value={form.benefits} localOnly />
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PreviewValue({
  label,
  value,
  localOnly = false,
}: {
  label: string;
  value: string;
  localOnly?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/7 bg-white/[0.025] px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">
        {label}
        {localOnly ? " · local" : ""}
      </p>
      <p className="mt-1 break-words text-sm text-white/80">
        {value.trim() || "Not added"}
      </p>
    </div>
  );
}

function renderPlainTextDescription(description: string): ReactNode {
  const lines = description.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let bulletLines: string[] = [];

  const flushBullets = () => {
    if (bulletLines.length === 0) {
      return;
    }

    const key = `list-${blocks.length}`;
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-5 marker:text-brand-cyan-light">
        {bulletLines.map((line, index) => (
          <li key={`${key}-${index}`}>{line}</li>
        ))}
      </ul>
    );
    bulletLines = [];
  };

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    const bulletMatch = /^[-*]\s+(.+)$/.exec(line);
    const headingMatch = /^#{1,3}\s+(.+)$/.exec(line);

    if (bulletMatch) {
      bulletLines.push(bulletMatch[1]);
      continue;
    }

    flushBullets();

    if (!line) {
      continue;
    }

    if (headingMatch) {
      blocks.push(
        <h5 key={`heading-${index}`} className="pt-1 text-sm font-semibold text-white/90">
          {headingMatch[1]}
        </h5>
      );
      continue;
    }

    blocks.push(
      <p key={`paragraph-${index}`} className="whitespace-pre-wrap">
        {rawLine}
      </p>
    );
  }

  flushBullets();

  if (blocks.length === 0) {
    return <p className="text-white/45">Add a plain-text description to preview it here.</p>;
  }

  return <div className="space-y-3">{blocks}</div>;
}
