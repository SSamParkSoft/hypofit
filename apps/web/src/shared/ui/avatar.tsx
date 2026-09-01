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
        "grid size-10 shrink-0 place-items-center overflow-hidden border bg-hypo-surface text-hypo-icon",
        shape === "circle" ? "rounded-full" : "rounded-hypo-lg",
        borderTone === "strong"
          ? "border-hypo-text-muted/55"
          : "border-hypo-border",
        className,
      )}
    >
      {src ? (
        <img alt={alt} className="size-full object-cover" src={src} />
      ) : (
        <span
          aria-label={alt}
          className="grid size-full place-items-center bg-hypo-surface-muted"
          role="img"
        >
          <UserRound className="text-hypo-icon-muted" size="52%" strokeWidth={2.1} />
        </span>
      )}
    </div>
  );
}
