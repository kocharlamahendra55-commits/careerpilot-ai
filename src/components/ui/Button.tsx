"use client";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer select-none relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-brand-purple to-brand-indigo text-white shadow-button hover:-translate-y-0.5 hover:shadow-glow-purple active:translate-y-0 active:scale-[0.98]",
        secondary:
          "bg-white/5 border border-white/10 text-white/80 hover:bg-white/8 hover:border-brand-purple/40 hover:text-white active:scale-[0.98]",
        ghost:
          "bg-transparent text-white/60 hover:bg-white/5 hover:text-white active:scale-[0.98]",
        destructive:
          "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:border-red-500/50 active:scale-[0.98]",
        success:
          "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:scale-[0.98]",
        outline:
          "border border-brand-purple/40 text-brand-purple-light hover:bg-brand-purple/10 hover:border-brand-purple/70 active:scale-[0.98]",
      },
      size: {
        sm: "h-8 px-4 text-xs",
        md: "h-10 px-6 text-sm",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Shine effect for primary */}
        {variant === "primary" && (
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />
        )}
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
