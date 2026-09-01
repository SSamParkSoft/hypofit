import { type ChatFilter, chatFilterLabels } from "../model/chatRoomModel";
import { cn } from "../../../shared/ui/cn";

interface ChatFilterTabsProps {
  activeFilter: ChatFilter;
  counts: Record<ChatFilter, number>;
  onChange: (filter: ChatFilter) => void;
}

export function ChatFilterTabs({
  activeFilter,
  counts,
  onChange,
}: ChatFilterTabsProps) {
  const filters: ChatFilter[] = ["all", "open", "selected", "rejected", "closed"];

  return (
    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {filters.map((filter) => {
        const isActive = filter === activeFilter;

        return (
          <button
            key={filter}
            className={cn(
              "inline-flex h-[30px] shrink-0 items-center gap-1 rounded-hypo-pill border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
              isActive
                ? "border-hypo-brand/25 bg-hypo-brand-soft text-hypo-brand"
                : "border-hypo-border bg-hypo-bg text-hypo-text-muted hover:border-hypo-brand/30 hover:bg-hypo-surface-muted hover:text-hypo-text",
            )}
            type="button"
            onClick={() => onChange(filter)}
          >
            {chatFilterLabels[filter]}
            <span
              className={cn(
                "text-[10px]",
                isActive ? "text-hypo-brand/70" : "text-hypo-text-soft",
              )}
            >
              {counts[filter]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
