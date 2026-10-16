"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Inbox } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type EmptyStateActionVariant = NonNullable<ComponentProps<typeof Button>["variant"]>;

export type EmptyStateAction =
  | {
      label: string;
      href: string;
      onClick?: never;
      ariaLabel?: string;
      variant?: EmptyStateActionVariant;
    }
  | {
      label: string;
      onClick: () => void;
      href?: never;
      ariaLabel?: string;
      variant?: EmptyStateActionVariant;
    };

function isLinkAction(
  action: EmptyStateAction
): action is Extract<EmptyStateAction, { href: string }> {
  return typeof action.href === "string";
}

export interface EmptyStateProps {
  title: string;
  description: ReactNode;
  /** A route- or flow-scoped next action supplied by the consuming Phase 2 page. */
  action?: EmptyStateAction;
  icon?: LucideIcon;
  className?: string;
}

/**
 * Success-state presentation for an empty result. It accepts a single explicit
 * next action so pages can keep recovery within their approved Phase 2 flow.
 */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: EmptyStateProps) {
  const titleId = useId();
  const actionVariant = action?.variant ?? "primary";

  return (
    <Card
      role="status"
      aria-live="polite"
      aria-labelledby={titleId}
      className={cn(
        "border-dashed border-white/10 bg-white/[0.02] text-center motion-reduce:transition-none",
        className
      )}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center px-1 py-2 sm:px-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10 text-brand-purple-light">
          <Icon aria-hidden="true" size={23} strokeWidth={1.9} />
        </span>
        <h2 id={titleId} className="mt-5 text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>

        {action ? (
          <div className="mt-6 flex max-w-full flex-wrap justify-center gap-2">
            {isLinkAction(action) ? (
              <Link
                href={action.href}
                aria-label={action.ariaLabel ?? action.label}
                className={cn(
                  buttonVariants({ variant: actionVariant, size: "md" }),
                  "max-w-full whitespace-normal"
                )}
              >
                <span>{action.label}</span>
                <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
              </Link>
            ) : (
              <Button
                type="button"
                variant={actionVariant}
                onClick={action.onClick}
                aria-label={action.ariaLabel ?? action.label}
                className="max-w-full whitespace-normal"
              >
                <span>{action.label}</span>
                <ArrowRight aria-hidden="true" size={16} strokeWidth={2} />
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
