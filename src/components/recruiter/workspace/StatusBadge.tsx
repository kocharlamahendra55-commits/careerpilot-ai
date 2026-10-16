"use client";

import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  CheckCircle2,
  CircleDot,
  Clock3,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type StatusBadgeVariant = "purple" | "cyan" | "green" | "red" | "yellow" | "pink" | "gray";

type StatusAppearance = {
  variant: StatusBadgeVariant;
  Icon: LucideIcon;
};

function getStatusAppearance(status: string): StatusAppearance {
  const normalizedStatus = status.trim().toUpperCase();

  if (["PUBLISHED", "ACTIVE", "HIRED", "OFFER", "OFFERED"].includes(normalizedStatus)) {
    return { variant: "green", Icon: CheckCircle2 };
  }

  if (["REJECT", "REJECTED"].includes(normalizedStatus)) {
    return { variant: "red", Icon: XCircle };
  }

  if (["ARCHIVED", "CLOSED"].includes(normalizedStatus)) {
    return { variant: "gray", Icon: Archive };
  }

  if (
    [
      "DRAFT",
      "PENDING",
      "APPLIED",
      "IN_REVIEW",
      "UNDER_REVIEW",
      "INTERVIEW",
      "SHORTLISTED",
    ].includes(normalizedStatus)
  ) {
    return { variant: "yellow", Icon: Clock3 };
  }

  return { variant: "purple", Icon: CircleDot };
}

export interface StatusBadgeProps
  extends Omit<ComponentProps<typeof Badge>, "children" | "dot" | "variant"> {
  /** The exact source-backed job or application status returned by the API. */
  status: string;
}

/**
 * Shows a source-backed status without relying on color alone. The visible status
 * text remains exactly the value supplied by the caller; only its visual variant is derived.
 */
export function StatusBadge({
  status,
  className,
  "aria-label": ariaLabel,
  ...props
}: StatusBadgeProps) {
  const { variant, Icon } = getStatusAppearance(status);

  return (
    <Badge
      {...props}
      variant={variant}
      aria-label={ariaLabel ?? `Status: ${status}`}
      className={cn("max-w-full whitespace-normal", className)}
    >
      <Icon aria-hidden="true" size={14} strokeWidth={2.1} className="shrink-0" />
      <span>{status}</span>
    </Badge>
  );
}
