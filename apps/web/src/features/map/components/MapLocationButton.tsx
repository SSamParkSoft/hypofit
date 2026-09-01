import { LoaderCircle, LocateFixed } from "lucide-react";

import { cn } from "../../../shared/ui/cn";

export interface MapLocationButtonProps {
  className?: string;
  isRequesting: boolean;
  onClick: () => void;
}

export function MapLocationButton({
  className,
  isRequesting,
  onClick,
}: MapLocationButtonProps) {
  return (
    <button
      aria-busy={isRequesting}
      aria-label={isRequesting ? "현재 위치 확인 중" : "현재 위치로 이동"}
      className={cn(
        "grid size-10 place-items-center rounded-hypo-pill border border-hypo-border bg-hypo-surface text-hypo-brand transition-[background-color,border-color,color,transform,opacity]",
        "hover:border-hypo-brand/35 hover:bg-hypo-brand-soft active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hypo-brand/35 focus-visible:ring-offset-2",
        "disabled:cursor-wait disabled:bg-hypo-surface-muted disabled:text-hypo-text-soft disabled:opacity-90",
        className,
      )}
      disabled={isRequesting}
      title={isRequesting ? "현재 위치를 확인하고 있어요" : "현재 위치로 이동"}
      type="button"
      onClick={onClick}
    >
      {isRequesting ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={19} />
      ) : (
        <LocateFixed aria-hidden="true" size={19} strokeWidth={2.2} />
      )}
    </button>
  );
}
