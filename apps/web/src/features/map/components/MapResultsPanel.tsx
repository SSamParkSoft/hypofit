import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { getWorkspaceRegionClassName } from "../../../shared/ui/workspace";
import { EmptyState, ErrorState } from "../../../shared/ui/state";
import type {
  LocationStatus,
  MapFilter,
  MapPostView,
  SearchCenter,
} from "../model/mapPageModel";
import { MapFilterChips } from "./MapFilterChips";
import { MapLocationNotice } from "./MapLocationNotice";
import { MapListRow, SelectedMapPostCard } from "./MapPostCards";

export interface MapResultsPanelProps {
  activeFilter: MapFilter;
  isError: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  locationStatus: LocationStatus;
  onFilterChange: (filter: MapFilter) => void;
  onSelect: (postId: string) => void;
  searchCenter: SearchCenter | null;
  searchControls: ReactNode;
  selectedView: MapPostView | null;
  viewedPostIds: Set<string>;
  views: MapPostView[];
}

export function MapResultsPanel({
  activeFilter,
  isError,
  isLoading,
  isRefreshing,
  locationStatus,
  onFilterChange,
  onSelect,
  searchCenter,
  searchControls,
  selectedView,
  viewedPostIds,
  views,
}: MapResultsPanelProps) {
  return (
    <aside
      aria-busy={isRefreshing}
      className="hidden h-full min-h-0 overflow-hidden bg-hypo-surface min-[1200px]:grid min-[1200px]:grid-rows-[auto_auto_minmax(0,1fr)] min-[1200px]:border-l min-[1200px]:border-hypo-border"
    >
      <div className="flex items-start justify-between gap-3 border-b border-hypo-border px-4 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6 text-hypo-text">지역 모집글</h2>
          <p className="mt-1 text-sm leading-5 text-hypo-text-muted">
            검색, 현재 위치, 목록 비교를 한 화면에서 이어가세요.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-hypo-pill border border-hypo-border bg-hypo-surface px-3 py-1 text-xs font-semibold text-hypo-brand">
          {isRefreshing ? (
            <LoaderCircle aria-label="지도 모집글 업데이트 중" className="animate-spin" size={12} />
          ) : null}
          {views.length}건
        </span>
      </div>

      <div className="grid gap-3 border-b border-hypo-border px-4 py-4">
        {searchControls}

        <MapLocationNotice
          className="rounded-none bg-transparent px-0 py-0 shadow-none"
          locationStatus={locationStatus}
          searchCenter={searchCenter}
        />

        <MapFilterChips activeFilter={activeFilter} onFilterChange={onFilterChange} />

        {selectedView ? (
          <div className="overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-bg">
            <SelectedMapPostCard view={selectedView} />
          </div>
        ) : null}
      </div>

      <div className={getWorkspaceRegionClassName({ scroll: "panel" })}>
        <div className="px-4 py-3">
          {isLoading ? <MapResultRowsLoading /> : null}

          {isError ? (
            <ErrorState
              className="rounded-none border-0 bg-transparent px-0 py-3 text-left"
              title="지도 모집글을 불러오지 못했습니다."
            >
              API 연결 상태를 확인한 뒤 다시 시도하세요.
            </ErrorState>
          ) : null}

          {!isLoading && !isError && views.length === 0 ? (
            <EmptyState
              className="rounded-none border-0 bg-transparent px-0 py-6 text-left"
              title="이 지역에는 모집글이 없어요."
            >
              반경을 넓히거나 지도를 움직여 다른 지역을 살펴보세요.
            </EmptyState>
          ) : null}

          {!isLoading && !isError && views.length > 0 ? (
            <div className="divide-y divide-hypo-border/80">
              {views.map((view) => (
                <MapListRow
                  key={view.post.id}
                  isSelected={view.post.id === selectedView?.post.id}
                  isViewed={viewedPostIds.has(view.post.id)}
                  view={view}
                  onSelect={() => onSelect(view.post.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function MapResultRowsLoading() {
  return (
    <div
      aria-atomic="true"
      aria-busy="true"
      aria-label="지도 모집글을 불러오는 중입니다."
      className="divide-y divide-hypo-border/80"
      role="status"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="grid min-h-[84px] gap-2 py-3.5 motion-safe:animate-pulse"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="h-3.5 w-3/5 rounded-hypo-sm bg-hypo-surface-muted" />
            <span className="h-3.5 w-14 rounded-hypo-sm bg-hypo-surface-muted" />
          </div>
          <span className="h-3 w-4/5 rounded-hypo-sm bg-hypo-surface-muted" />
          <div className="flex gap-2">
            <span className="h-4 w-12 rounded-hypo-pill bg-hypo-surface-muted" />
            <span className="h-4 w-20 rounded-hypo-pill bg-hypo-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
