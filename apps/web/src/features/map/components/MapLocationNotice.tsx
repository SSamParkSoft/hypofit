import { cn } from "../../../shared/ui/cn";
import type { LocationStatus, SearchCenter } from "../model/mapPageModel";

export function MapLocationNotice({
  className,
  locationStatus,
  searchCenter,
}: {
  className?: string;
  locationStatus: LocationStatus;
  searchCenter: SearchCenter | null;
}) {
  if (locationStatus === "granted" && searchCenter?.source === "current") {
    return null;
  }

  if (locationStatus === "granted" && searchCenter?.source === "map") {
    return null;
  }

  if (locationStatus === "requesting") {
    return (
      <p
        className={cn(
          "rounded-hypo-pill border border-hypo-border bg-hypo-surface px-3 py-2 text-[11px] font-semibold text-hypo-text-muted",
          className,
        )}
      >
        근처 인터뷰를 찾기 위해 현재 위치를 확인하고 있어요.
      </p>
    );
  }

  if (locationStatus === "denied") {
    return (
      <p
        className={cn(
          "rounded-hypo-lg border border-hypo-border bg-hypo-surface px-3 py-2 text-[11px] font-medium leading-4 text-hypo-text-muted",
          className,
        )}
      >
        위치 권한이 꺼져 있어요. 지역을 검색하거나 지도를 움직여 찾아볼 수 있어요.
      </p>
    );
  }

  if (locationStatus === "unavailable") {
    return (
      <p
        className={cn(
          "rounded-hypo-lg border border-hypo-border bg-hypo-surface px-3 py-2 text-[11px] font-medium leading-4 text-hypo-text-muted",
          className,
        )}
      >
        현재 위치를 확인하지 못했어요. 기본 지역의 인터뷰를 먼저 보여드릴게요.
      </p>
    );
  }

  return null;
}
