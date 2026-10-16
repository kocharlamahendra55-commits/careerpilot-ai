"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertsListProps {
  alerts: {
    type: "info" | "warning";
    message: string;
  }[];
}

const ALERT_STYLES = {
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/25",
  },
  info: {
    icon: Info,
    iconColor: "text-brand-cyan-light",
    iconBg: "bg-brand-cyan/10 border-brand-cyan/25",
  },
} as const;

export function AlertsList({ alerts }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-xl border border-white/6 bg-white/3 px-4 py-4">
        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-white/40">All caught up — no alerts right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => {
        const { icon: Icon, iconColor, iconBg } = ALERT_STYLES[alert.type];
        return (
          <div
            key={index}
            className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-3"
          >
            <span
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg border shrink-0",
                iconBg
              )}
            >
              <Icon size={14} className={iconColor} />
            </span>
            <p className="text-sm text-white/70 leading-snug pt-0.5">{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
