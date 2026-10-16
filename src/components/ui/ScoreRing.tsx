"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  animated?: boolean;
}

function getScoreGradientId(score: number) {
  if (score >= 80) return "gradient-green";
  if (score >= 60) return "gradient-yellow";
  if (score >= 40) return "gradient-orange";
  return "gradient-red";
}

function getScoreColors(score: number): [string, string] {
  if (score >= 80) return ["#10B981", "#34D399"];
  if (score >= 60) return ["#F59E0B", "#FCD34D"];
  if (score >= 40) return ["#F97316", "#FDBA74"];
  return ["#EF4444", "#F87171"];
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  className,
  label,
  animated = true,
}: ScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (displayScore / 100) * circumference;
  const gradientId = getScoreGradientId(score);
  const [color1, color2] = getScoreColors(score);

  useEffect(() => {
    if (!animated) return;
    let current = 0;
    const step = score / 60;
    const timer = setInterval(() => {
      current += step;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [score, animated]);

  // Typography scales gently with the ring size so larger rings (e.g. hero
  // score sections) feel more prominent without affecting smaller usages.
  const scoreFontSize = Math.max(18, Math.min(42, Math.round(size * 0.24)));
  const labelFontSize = Math.max(9, Math.min(11, Math.round(size * 0.09)));

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Ambient glow tinted to the score's color tier, sitting behind the ring */}
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: `radial-gradient(circle, ${color1}35, transparent 72%)`,
          filter: "blur(20px)",
        }}
      />
      <svg
        width={size}
        height={size}
        className="score-ring relative"
        style={{ filter: `drop-shadow(0 0 12px ${color1}4D)` }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span
          className="font-extrabold text-white leading-none"
          style={{ color: color2, fontSize: scoreFontSize, letterSpacing: "-0.02em" }}
        >
          {displayScore}
        </span>
        {label && (
          <span
            className="text-white/45 uppercase tracking-wider mt-1 font-semibold"
            style={{ fontSize: labelFontSize }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
