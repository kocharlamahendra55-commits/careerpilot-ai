"use client";

import { useId } from "react";
import { StickyNote } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";

export interface NotesPlaceholderProps {
  className?: string;
}

/**
 * A visibly non-persisted recruiter notes placeholder. The current application
 * service exposes no notes storage (D4), so this surface intentionally has no
 * save control and no request path: anything typed here is never stored.
 */
export function NotesPlaceholder({ className }: NotesPlaceholderProps) {
  const headingId = useId();
  const noticeId = useId();
  const textareaId = useId();

  return (
    <Card
      aria-labelledby={headingId}
      className={cn("space-y-4 motion-reduce:transition-none", className)}
    >
      <div className="flex items-center gap-2.5">
        <StickyNote aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-white/60" />
        <h2 id={headingId} className="text-base font-semibold tracking-tight text-white">
          Recruiter notes
        </h2>
      </div>

      <UnavailabilityIndicator
        dependency="D4"
        message="Recruiter notes are not saved. The current application service has no notes storage, so anything typed here is discarded and never persisted."
      />

      <div>
        <label htmlFor={textareaId} className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">
          Notes (not saved)
        </label>
        <textarea
          id={textareaId}
          disabled
          aria-disabled="true"
          aria-describedby={noticeId}
          rows={4}
          placeholder="Notes cannot be saved yet."
          className="mt-2 w-full cursor-not-allowed resize-none rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3.5 py-3 text-sm leading-6 text-white/50 placeholder:text-white/30"
        />
        <p id={noticeId} className="mt-2 text-xs leading-5 text-white/45">
          This field is a placeholder only. There is no save action because notes are not stored anywhere.
        </p>
      </div>
    </Card>
  );
}
