import { ArrowLeft } from "lucide-react";

import { navigateBack } from "../navigation/appNavigation";
import { cn } from "./cn";

interface BackLinkProps {
  ariaLabel?: string;
  className?: string;
  href?: string;
}

export function BackLink({
  ariaLabel = "뒤로가기",
  className,
  href = "/",
}: BackLinkProps) {
  return (
    <a
      aria-label={ariaLabel}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-hypo-md text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
        className,
      )}
      href={href}
      onClick={(event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        event.preventDefault();
        navigateBack(href);
      }}
    >
      <ArrowLeft size={17} />
    </a>
  );
}
