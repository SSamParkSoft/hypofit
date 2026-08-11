import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "./cn";

const badgeVariants = cva(
  "ui-badge-text inline-flex max-w-full items-center rounded-hypo-pill border px-2 py-0.5 text-hypo-text",
  {
    variants: {
      intent: {
        neutral: "border-hypo-border bg-hypo-bg text-hypo-text-muted",
        brand: "border-hypo-brand/10 bg-hypo-brand-soft text-hypo-brand",
        info: "border-blue-100 bg-hypo-info-soft text-hypo-info",
        reward: "border-orange-100 bg-hypo-reward-soft text-hypo-reward",
        success: "border-green-100 bg-hypo-success-soft text-hypo-success",
        warning: "border-amber-100 bg-hypo-warning-soft text-hypo-warning",
        danger: "border-red-100 bg-hypo-danger-soft text-hypo-danger",
      },
    },
    defaultVariants: {
      intent: "neutral",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, intent, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ intent }), className)} {...props} />;
}
