import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

const buttonVariants = cva(
  "ui-control-text inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-hypo-md transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 focus-visible:ring-offset-2 focus-visible:ring-offset-hypo-bg active:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "border border-transparent bg-hypo-brand text-white hover:bg-hypo-brand-strong",
        secondary:
          "border border-hypo-border bg-hypo-surface text-hypo-text hover:bg-hypo-bg",
        tonal:
          "border border-transparent bg-hypo-brand-soft text-hypo-brand hover:bg-[#dcebe7]",
        ghost:
          "border border-transparent text-hypo-text-muted hover:bg-hypo-surface-muted hover:text-hypo-text",
        quiet:
          "border border-transparent text-hypo-brand hover:bg-hypo-brand-soft/80",
        danger:
          "border border-transparent bg-hypo-danger text-white hover:bg-red-800",
        outlineDanger:
          "border border-hypo-danger/35 bg-hypo-surface text-hypo-danger hover:bg-hypo-danger-soft",
        success:
          "border border-transparent bg-hypo-success text-white hover:bg-green-800",
      },
      size: {
        sm: "min-h-9 px-3.5",
        md: "min-h-11 px-4 md:min-h-10",
        lg: "min-h-12 px-5 md:min-h-11",
        icon: "size-11 p-0 md:size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ size, variant }), className)}
      type={type}
      {...props}
    />
  ),
);

Button.displayName = "Button";
