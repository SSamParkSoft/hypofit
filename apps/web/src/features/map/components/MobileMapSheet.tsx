import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "../../../shared/ui/cn";
import type {
  LocationStatus,
  MapFilter,
  MapPostView,
  SearchCenter,
  SheetLevel,
} from "../model/mapPageModel";
import {
  clampSheetHeight,
  getDisplaySheetLevel,
  getNextSheetLevel,
  getSettledSheetHeightAfterDrag,
  getSheetHeights,
  sheetDragClickThresholdPx,
  sheetMinHeightPx,
} from "../model/mapPageModel";
import { MapFilterChips } from "./MapFilterChips";
import { MapLocationNotice } from "./MapLocationNotice";
import { UnselectedMapSummary } from "./MapPostCards";

export interface MobileMapSheetProps {
  activeFilter: MapFilter;
  isError: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  locationStatus: LocationStatus;
  onFilterChange: (filter: MapFilter) => void;
  onSelect: (postId: string) => void;
  onSheetHeightChange: (heightPx: number) => void;
  onSheetLevelChange: (level: SheetLevel) => void;
  searchCenter: SearchCenter | null;
  sheetLevel: SheetLevel;
  viewedPostIds: Set<string>;
  views: MapPostView[];
}

export function MobileMapSheet({
  activeFilter,
  isError,
  isLoading,
  isRefreshing,
  locationStatus,
  onFilterChange,
  onSelect,
  onSheetHeightChange,
  onSheetLevelChange,
  searchCenter,
  sheetLevel,
  viewedPostIds,
  views,
}: MobileMapSheetProps) {
  const dragStartYRef = useRef<number | null>(null);
  const dragBaseHeightRef = useRef<number | null>(null);
  const didDragRef = useRef(false);
  const skipNextPresetSyncRef = useRef(false);
  const [settledHeightPx, setSettledHeightPx] = useState<number | null>(null);
  const [dragHeightPx, setDragHeightPx] = useState<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(() => getAvailableMapViewportHeight());
  const sheetHeights = useMemo(() => getSheetHeights(viewportHeight), [viewportHeight]);
  const baseHeight = sheetHeights[sheetLevel];
  const currentHeight = dragHeightPx ?? settledHeightPx ?? baseHeight;
  const isDragging = dragHeightPx !== null;

  useEffect(() => {
    const syncViewportHeight = () => setViewportHeight(getAvailableMapViewportHeight());
    syncViewportHeight();
    window.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("resize", syncViewportHeight);
    return () => {
      window.removeEventListener("resize", syncViewportHeight);
      window.visualViewport?.removeEventListener("resize", syncViewportHeight);
    };
  }, []);

  useEffect(() => {
    if (skipNextPresetSyncRef.current) {
      skipNextPresetSyncRef.current = false;
      return;
    }

    setSettledHeightPx(baseHeight);
  }, [baseHeight]);

  useEffect(() => {
    onSheetHeightChange(currentHeight);
  }, [currentHeight, onSheetHeightChange]);

  const handleDragEnd = (clientY: number) => {
    const startY = dragStartYRef.current;
    const dragBaseHeight = dragBaseHeightRef.current ?? currentHeight;
    dragStartYRef.current = null;
    dragBaseHeightRef.current = null;

    if (startY === null) {
      setDragHeightPx(null);
      return;
    }

    const deltaY = clientY - startY;
    const finalHeight = clampSheetHeight(dragBaseHeight - deltaY, sheetHeights);
    const settledHeight = getSettledSheetHeightAfterDrag(finalHeight, deltaY, sheetHeights);
    const displayLevel = getDisplaySheetLevel(settledHeight, sheetHeights);

    setSettledHeightPx(settledHeight);
    setDragHeightPx(null);
    skipNextPresetSyncRef.current = displayLevel !== sheetLevel;
    onSheetLevelChange(displayLevel);
  };

  return (
    <section
      aria-busy={isRefreshing}
      style={
        {
          "--map-sheet-height": `${currentHeight}px`,
        } as CSSProperties
      }
      className={cn(
        "h-[var(--map-sheet-height)] overflow-hidden rounded-t-[24px] border-x-0 border-b-0 border-t border-hypo-border bg-hypo-surface shadow-hypo-floating will-change-[height]",
        isDragging ? "transition-none" : "transition-[height] duration-200 ease-out",
      )}
    >
      <button
        aria-label="지도 패널 높이 변경"
        className="grid w-full touch-none place-items-center px-4 pb-1.5 pt-2.5"
        type="button"
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }

          onSheetLevelChange(getNextSheetLevel(sheetLevel));
        }}
        onPointerCancel={() => {
          dragStartYRef.current = null;
          dragBaseHeightRef.current = null;
          setDragHeightPx(null);
        }}
        onPointerDown={(event) => {
          dragStartYRef.current = event.clientY;
          dragBaseHeightRef.current = currentHeight;
          didDragRef.current = false;
          setDragHeightPx(currentHeight);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragStartYRef.current === null) {
            return;
          }

          const deltaY = event.clientY - dragStartYRef.current;
          if (Math.abs(deltaY) > sheetDragClickThresholdPx) {
            didDragRef.current = true;
          }
          const dragBaseHeight = dragBaseHeightRef.current ?? currentHeight;
          setDragHeightPx(clampSheetHeight(dragBaseHeight - deltaY, sheetHeights));
        }}
        onPointerUp={(event) => {
          handleDragEnd(event.clientY);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <span className="h-1 w-10 rounded-full bg-hypo-border" />
      </button>

      {sheetLevel !== "collapsed" ? (
        <div className="grid gap-2 border-b border-hypo-border/70 px-3.5 pb-3">
          <MapLocationNotice
            className="rounded-none bg-transparent px-0 py-0 shadow-none"
            locationStatus={locationStatus}
            searchCenter={searchCenter}
          />
          <MapFilterChips activeFilter={activeFilter} className="pb-0.5" onFilterChange={onFilterChange} />
        </div>
      ) : null}

      {isLoading ? (
        <MobileMapSheetLoading sheetLevel={sheetLevel} />
      ) : isError ? (
        <MobileMapSheetMessage
          description="잠시 후 다시 시도해 주세요."
          sheetLevel={sheetLevel}
          title="모집글을 불러오지 못했어요."
          variant="error"
        />
      ) : views.length === 0 ? (
        <MobileMapSheetMessage
          description="지도를 움직이거나 검색 지역을 바꿔보세요."
          sheetLevel={sheetLevel}
          title="이 지역에는 모집글이 없어요."
          variant="empty"
        />
      ) : (
        <UnselectedMapSummary
          isRefreshing={isRefreshing}
          sheetLevel={sheetLevel}
          viewedPostIds={viewedPostIds}
          views={views}
          onSelect={onSelect}
        />
      )}
    </section>
  );
}

function MobileMapSheetLoading({ sheetLevel }: { sheetLevel: SheetLevel }) {
  const rowCount = sheetLevel === "expanded" ? 5 : sheetLevel === "mid" ? 3 : 1;

  return (
    <div
      aria-atomic="true"
      aria-busy="true"
      aria-label="지도 모집글을 불러오는 중입니다."
      className="px-3.5 pb-3.5 pt-1"
      role="status"
    >
      <div className="divide-y divide-hypo-border/80">
        {Array.from({ length: rowCount }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="grid min-h-14 grid-cols-[minmax(0,1fr)_56px] content-center gap-3 py-3 motion-safe:animate-pulse"
          >
            <span className="grid gap-2">
              <span className="h-3.5 w-3/5 rounded-hypo-sm bg-hypo-surface-muted" />
              <span className="h-3 w-4/5 rounded-hypo-sm bg-hypo-surface-muted" />
            </span>
            <span className="h-3.5 w-14 rounded-hypo-sm bg-hypo-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileMapSheetMessage({
  description,
  sheetLevel,
  title,
  variant,
}: {
  description: string;
  sheetLevel: SheetLevel;
  title: string;
  variant: "empty" | "error";
}) {
  return (
    <div
      className="px-4 pb-4 pt-1"
      role={variant === "error" ? "alert" : "status"}
    >
      <p
        className={cn(
          "text-sm font-semibold",
          variant === "error" ? "text-hypo-danger" : "text-hypo-text",
        )}
      >
        {title}
      </p>
      {sheetLevel !== "collapsed" ? (
        <p className="mt-1 text-xs leading-5 text-hypo-text-muted">{description}</p>
      ) : null}
    </div>
  );
}

function getAvailableMapViewportHeight() {
  if (typeof window === "undefined") {
    return 812 - sheetMinHeightPx;
  }

  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const mobileNav = document.querySelector<HTMLElement>(
    'nav[aria-label="Hypofit mobile navigation"]',
  );
  const navHeight =
    mobileNav && mobileNav.getBoundingClientRect().height > 0
      ? mobileNav.getBoundingClientRect().height
      : 0;

  return Math.max(360, viewportHeight - navHeight);
}
