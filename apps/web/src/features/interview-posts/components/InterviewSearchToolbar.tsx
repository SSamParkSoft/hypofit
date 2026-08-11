import * as Dialog from "@radix-ui/react-dialog";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { interviewModeLabels } from "./interviewPostMeta";
import {
  formatRadius,
  modeFilters,
  nearbyRadiusOptions,
  type InterviewsSearchState,
  type ModeFilter,
  rewardFilters,
  type RewardFilter,
  type NearbyStatus,
} from "../model/interviewsSearch";

interface InterviewSearchToolbarProps {
  isNearbyEnabled: boolean;
  modeFilter: ModeFilter;
  nearbyRadiusM: number;
  nearbyStatus: NearbyStatus;
  onClearFilters: () => void;
  onModeChange: (mode: ModeFilter) => void;
  onNearbyDisable: () => void;
  onNearbyEnable: () => void;
  onNearbyRadiusChange: (radiusM: number) => void;
  onQueryChange: (query: string) => void;
  onRewardChange: (reward: RewardFilter) => void;
  query: InterviewsSearchState["query"];
  resultCount: number;
  rewardFilter: RewardFilter;
}

const desktopFilterChipClassName =
  "min-[1200px]:h-[30px] min-[1200px]:min-h-0 min-[1200px]:px-2.5 min-[1200px]:font-medium min-[1200px]:leading-4";

export function InterviewSearchToolbar({
  isNearbyEnabled,
  modeFilter,
  nearbyRadiusM,
  nearbyStatus,
  onClearFilters,
  onModeChange,
  onNearbyDisable,
  onNearbyEnable,
  onNearbyRadiusChange,
  onQueryChange,
  onRewardChange,
  query,
  resultCount,
  rewardFilter,
}: InterviewSearchToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const activeFilterCount =
    Number(modeFilter !== "all") + Number(rewardFilter !== "all") + Number(isNearbyEnabled);
  const activeFilters = useMemo(
    () =>
      [
        modeFilter !== "all"
          ? {
              label: interviewModeLabels[modeFilter],
              onRemove: () => onModeChange("all"),
            }
          : null,
        rewardFilter !== "all"
          ? {
              label:
                rewardFilters.find((filter) => filter.value === rewardFilter)?.label ?? "사례비",
              onRemove: () => onRewardChange("all"),
            }
          : null,
        isNearbyEnabled
          ? {
              label: `내 근처 · ${formatRadius(nearbyRadiusM)}`,
              onRemove: onNearbyDisable,
            }
          : null,
      ].filter(Boolean) as Array<{ label: string; onRemove: () => void }>,
    [isNearbyEnabled, modeFilter, nearbyRadiusM, onModeChange, onNearbyDisable, onRewardChange, rewardFilter],
  );

  return (
    <Dialog.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
      <section aria-label="인터뷰 검색과 필터" className="grid gap-3 border-b border-hypo-border pb-4">
        <div className="flex flex-col gap-3 min-[1200px]:flex-row min-[1200px]:items-center">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">인터뷰 검색</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hypo-text-soft"
              size={17}
            />
            <input
              className="min-h-11 w-full rounded-hypo-lg border border-hypo-border bg-hypo-bg pl-10 pr-3 text-sm font-semibold text-hypo-text outline-none transition-colors placeholder:text-hypo-text-soft focus:border-hypo-brand focus:ring-[3px] focus:ring-hypo-brand/15"
              placeholder="서비스, 타깃, 지역 검색"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
          <div className="flex items-center justify-between gap-3 min-[1200px]:shrink-0 min-[1200px]:justify-end">
            <p className="text-sm font-semibold text-hypo-text-muted">검색 결과 {resultCount}개</p>
            <Dialog.Trigger asChild>
              <button
                className="relative inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-hypo-lg border border-hypo-border bg-hypo-surface px-3 text-sm font-semibold text-hypo-text transition-colors hover:border-hypo-brand/45 hover:bg-hypo-brand-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 min-[1200px]:hidden"
                type="button"
              >
                <SlidersHorizontal size={16} />
                필터
                {activeFilterCount ? (
                  <span className="grid size-5 place-items-center rounded-hypo-pill bg-hypo-brand text-[11px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </Dialog.Trigger>
          </div>
        </div>

        <div className="hidden min-h-[30px] flex-wrap items-center gap-1.5 min-[1200px]:flex">
          <span className="shrink-0 text-[11px] font-medium leading-4 text-hypo-text-soft">진행 방식</span>
          {modeFilters.map((filter) => (
            <FilterChip
              key={filter.value}
              className={desktopFilterChipClassName}
              isSelected={modeFilter === filter.value}
              label={
                filter.value === "all"
                  ? filter.label
                  : interviewModeLabels[filter.value]
              }
              onClick={() => onModeChange(filter.value)}
            />
          ))}

          <span className="ml-3 shrink-0 text-[11px] font-medium leading-4 text-hypo-text-soft">사례비</span>
          {rewardFilters.map((filter) => (
            <FilterChip
              key={filter.value}
              className={desktopFilterChipClassName}
              isSelected={rewardFilter === filter.value}
              label={filter.label}
              onClick={() => onRewardChange(filter.value)}
            />
          ))}

          <span className="ml-3 shrink-0 text-[11px] font-medium leading-4 text-hypo-text-soft">지역</span>
          <FilterChip
            className={desktopFilterChipClassName}
            isSelected={isNearbyEnabled}
            label={nearbyStatus === "requesting" ? "위치 확인 중" : "내 근처"}
            onClick={isNearbyEnabled ? onNearbyDisable : onNearbyEnable}
          />
          {isNearbyEnabled
            ? nearbyRadiusOptions.map((radiusM) => (
                <FilterChip
                  key={radiusM}
                  className={desktopFilterChipClassName}
                  isSelected={nearbyRadiusM === radiusM}
                  label={formatRadius(radiusM)}
                  onClick={() => onNearbyRadiusChange(radiusM)}
                />
              ))
            : null}

          {activeFilterCount ? (
            <Button
              className="min-[1200px]:min-h-[30px] min-[1200px]:px-2.5 min-[1200px]:text-xs min-[1200px]:font-medium min-[1200px]:leading-4"
              size="sm"
              variant="ghost"
              onClick={onClearFilters}
            >
              초기화
            </Button>
          ) : null}
        </div>

        {activeFilters.length ? (
          <div className="flex min-h-8 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[1200px]:hidden">
            {activeFilters.map((filter) => (
              <ActiveFilterChip key={filter.label} label={filter.label} onRemove={filter.onRemove} />
            ))}
          </div>
        ) : null}

        {nearbyStatus === "denied" || nearbyStatus === "unavailable" ? (
          <p className="rounded-hypo-md bg-hypo-surface px-3 py-2 text-xs font-semibold leading-5 text-hypo-text-muted">
            위치 권한이 꺼져 있어요. 지역명으로 검색하거나 지도에서 직접 찾아볼 수 있어요.
          </p>
        ) : null}

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-1rem)] overflow-y-auto rounded-t-[22px] bg-hypo-surface px-5 pb-[calc(var(--app-safe-bottom)+1.25rem)] pt-5 shadow-hypo-floating focus:outline-none sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[430px] sm:max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-hypo-lg sm:p-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-hypo-pill bg-hypo-border sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-black text-hypo-text">필터</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-5 text-hypo-text-muted">
                  조건을 골라 맞는 인터뷰만 볼 수 있어요.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label="필터 닫기"
                  className="grid size-9 shrink-0 place-items-center rounded-hypo-pill text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text"
                  type="button"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-5 grid gap-5">
              <FilterGroup label="진행 방식">
                {modeFilters.map((filter) => (
                  <FilterChip
                    key={filter.value}
                    isSelected={modeFilter === filter.value}
                    label={
                      filter.value === "all"
                        ? filter.label
                        : interviewModeLabels[filter.value]
                    }
                    onClick={() => onModeChange(filter.value)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup label="사례비">
                {rewardFilters.map((filter) => (
                  <FilterChip
                    key={filter.value}
                    isSelected={rewardFilter === filter.value}
                    label={filter.label}
                    onClick={() => onRewardChange(filter.value)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup label="거리">
                <FilterChip
                  isSelected={isNearbyEnabled}
                  label={nearbyStatus === "requesting" ? "위치 확인 중" : "내 근처"}
                  onClick={isNearbyEnabled ? onNearbyDisable : onNearbyEnable}
                />
                {isNearbyEnabled
                  ? nearbyRadiusOptions.map((radiusM) => (
                      <FilterChip
                        key={radiusM}
                        isSelected={nearbyRadiusM === radiusM}
                        label={formatRadius(radiusM)}
                        onClick={() => onNearbyRadiusChange(radiusM)}
                      />
                    ))
                  : null}
              </FilterGroup>
            </div>

            <div className="mt-6 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <Button disabled={!activeFilterCount} variant="secondary" onClick={onClearFilters}>
                초기화
              </Button>
              <Dialog.Close asChild>
                <Button>결과 보기</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </section>
    </Dialog.Root>
  );
}

function ActiveFilterChip({
  className,
  label,
  onRemove,
}: {
  className?: string;
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-hypo-pill bg-hypo-brand-soft px-3 text-xs font-semibold text-hypo-brand",
        className,
      )}
      type="button"
      onClick={onRemove}
    >
      {label}
      <X size={13} />
    </button>
  );
}

function FilterGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-hypo-text-soft">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

function FilterChip({
  className,
  isSelected,
  label,
  onClick,
}: {
  className?: string;
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "min-h-11 shrink-0 rounded-hypo-pill px-3 text-xs font-semibold transition-colors",
        isSelected
          ? "bg-hypo-brand text-white min-[1200px]:border min-[1200px]:border-hypo-brand/15 min-[1200px]:bg-hypo-brand-soft min-[1200px]:text-hypo-brand"
          : "border border-hypo-border bg-hypo-surface text-hypo-text-muted hover:border-hypo-brand/40 hover:text-hypo-text",
        className,
      )}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
