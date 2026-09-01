import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "./cn";

const badgeVariants = cva(
  "ui-badge-text inline-flex max-w-full items-center rounded-hypo-lg border px-2.5 py-1 text-hypo-text",
  {
    variants: {
      intent: {
        neutral: "border-hypo-border bg-hypo-surface-muted text-hypo-text-muted",
        brand: "border-hypo-brand/12 bg-hypo-brand-soft text-hypo-brand",
        info: "border-hypo-info/12 bg-hypo-info-soft text-hypo-info",
        reward: "border-hypo-reward/12 bg-hypo-reward-soft text-hypo-reward",
        success: "border-hypo-success/12 bg-hypo-success-soft text-hypo-success",
        warning: "border-hypo-warning/12 bg-hypo-warning-soft text-hypo-warning",
        danger: "border-hypo-danger/12 bg-hypo-danger-soft text-hypo-danger",
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
