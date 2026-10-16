"use client";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md text-xs font-semibold px-2.5 py-1 border",
  {
    variants: {
      variant: {
        purple: "bg-brand-purple/15 border-brand-purple/30 text-brand-purple-light",
        cyan: "bg-brand-cyan/10 border-brand-cyan/25 text-brand-cyan-light",
        green: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
        red: "bg-red-500/10 border-red-500/25 text-red-400",
        yellow: "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
        pink: "bg-pink-500/10 border-pink-500/25 text-pink-400",
        gray: "bg-white/5 border-white/10 text-white/50",
      },
    },
    defaultVariants: {
      variant: "purple",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "green" && "bg-emerald-400",
            variant === "red" && "bg-red-400",
            variant === "yellow" && "bg-yellow-400",
            variant === "purple" && "bg-brand-purple-light",
            variant === "cyan" && "bg-brand-cyan-light",
            variant === "pink" && "bg-pink-400",
            variant === "gray" && "bg-white/40"
          )}
        />
      )}
      {children}
    </span>
  );
}
