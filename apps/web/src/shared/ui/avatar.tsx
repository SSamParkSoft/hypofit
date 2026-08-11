import { UserRound } from "lucide-react";

import { cn } from "./cn";

interface AvatarProps {
  alt: string;
  borderTone?: "default" | "strong";
  className?: string;
  fallback?: string;
  shape?: "rounded" | "circle";
  src?: string | null;
}

export function Avatar({
  alt,
  borderTone = "default",
  className,
  shape = "rounded",
  src,
}: AvatarProps) {
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden bg-hypo-surface-muted text-hypo-text-soft ring-inset",
        shape === "circle" ? "rounded-full" : "rounded-hypo-lg",
        borderTone === "strong"
          ? "ring-2 ring-hypo-text-muted/90"
          : "ring-1 ring-hypo-border",
        className,
      )}
    >
      {src ? (
        <img alt={alt} className="size-full object-cover" src={src} />
      ) : (
        <span
          aria-label={alt}
          className="grid size-full place-items-center bg-gradient-to-br from-hypo-surface to-hypo-brand-soft"
          role="img"
        >
          <UserRound className="text-hypo-brand/75" size="52%" strokeWidth={2.2} />
        </span>
      )}
    </div>
  );
}
