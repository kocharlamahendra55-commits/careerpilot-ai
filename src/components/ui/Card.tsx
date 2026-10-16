"use client";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva("rounded-2xl transition-all duration-300", {
  variants: {
    variant: {
      default:
        "glass-card p-6 sm:p-7",
      glow:
        "glass-card p-6 sm:p-7 gradient-border",
      flat:
        "bg-white/2 border border-white/5 rounded-2xl p-6 sm:p-7",
      stat:
        "glass-card p-5 hover:border-brand-purple/30",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base sm:text-lg font-semibold text-white/90 tracking-tight", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-white/50 mt-1.5", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mt-4 pt-4 border-t border-white/5", className)} {...props} />
  );
}
