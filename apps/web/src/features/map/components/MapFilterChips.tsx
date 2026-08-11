import { cn } from "../../../shared/ui/cn";
import { mapFilters, type MapFilter } from "../model/mapPageModel";

export function MapFilterChips({
  activeFilter,
  className,
  onFilterChange,
}: {
  activeFilter: MapFilter;
  className?: string;
  onFilterChange: (filter: MapFilter) => void;
}) {
  return (
    <div
      className={cn(
        "-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {mapFilters.map((filter) => (
        <button
          key={filter.value}
          className={cn(
            "h-8 shrink-0 rounded-full border px-3 text-[11px] font-semibold leading-none transition-colors",
            activeFilter === filter.value
              ? "border-hypo-brand bg-hypo-brand-soft text-hypo-brand"
              : "border-hypo-border bg-hypo-bg text-hypo-text-muted hover:border-hypo-brand/40 hover:bg-hypo-brand-soft hover:text-hypo-brand",
          )}
          type="button"
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
