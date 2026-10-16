"use client";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  className?: string;
  animated?: boolean;
}

function useCountUp(end: number, duration = 2000, start = 0) {
  const [count, setCount] = useState(start);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (typeof end !== "number") return;
    const startTime = performance.now();
    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + (end - start) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(update);
      }
    };
    frameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration, start]);

  return count;
}

export function StatsCard({
  title,
  value,
  suffix,
  description,
  icon: Icon,
  iconColor = "text-brand-purple-light",
  trend,
  className,
  animated = true,
}: StatsCardProps) {
  const numericValue = typeof value === "number" ? value : 0;
  const animatedValue = useCountUp(animated ? numericValue : 0, 2000);
  const displayValue = animated && typeof value === "number" ? animatedValue : value;
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <Card variant="stat" className={cn("group", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-medium mb-2">{title}</p>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-white tabular-nums">
              {displayValue}
            </span>
            {suffix && <span className="text-lg font-semibold text-white/50 mb-0.5">{suffix}</span>}
          </div>
          {description && (
            <p className="text-xs text-white/40 mt-1">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-semibold",
                  isPositiveTrend ? "text-emerald-400" : "text-red-400"
                )}
              >
                {isPositiveTrend ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-white/30">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-300",
            iconColor
          )}
        >
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
