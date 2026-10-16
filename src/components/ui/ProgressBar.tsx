"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getScoreColor } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  height?: number;
  animated?: boolean;
  color?: string;
}

export function ProgressBar({
  value,
  label,
  showValue = true,
  className,
  height = 6,
  animated = true,
  color,
}: ProgressBarProps) {
  const [width, setWidth] = useState(animated ? 0 : value);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setWidth(value), 100);
    return () => clearTimeout(timer);
  }, [value, animated]);

  const barColor = color || getScoreColor(value);

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-white/60">{label}</span>}
          {showValue && (
            <span className="text-sm font-semibold" style={{ color: barColor }}>
              {value}%
            </span>
          )}
        </div>
      )}
      <div
        className="rounded-full overflow-hidden bg-white/5"
        style={{ height: `${height}px` }}
      >
        <div
          className="h-full rounded-full relative"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
            transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: `0 0 10px ${barColor}60`,
          }}
        >
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full -mr-1.25"
            style={{ background: barColor, boxShadow: `0 0 6px ${barColor}` }}
          />
        </div>
      </div>
    </div>
  );
}
