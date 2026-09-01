import { useMemo, useRef, type KeyboardEvent, type MutableRefObject } from "react";

import { cn } from "../../../shared/ui/cn";
import type { MyInterviewTab, MyInterviewsTabMeta } from "../types";

interface MyInterviewsTabsProps {
  activeTab: MyInterviewTab;
  onChange: (tab: MyInterviewTab) => void;
  tabs: MyInterviewsTabMeta[];
}

export function MyInterviewsTabs({
  activeTab,
  onChange,
  tabs,
}: MyInterviewsTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeTabMeta = useMemo(
    () => tabs.find((tab) => tab.value === activeTab) ?? tabs[0],
    [activeTab, tabs],
  );

  return (
    <section className="grid gap-3" aria-labelledby="my-interviews-tabs-heading">
      <div className="grid gap-1">
        <h2 id="my-interviews-tabs-heading" className="ui-section-title text-hypo-text">
          확인할 목록
        </h2>
        <p className="text-xs text-hypo-text-muted">{activeTabMeta.description}</p>
      </div>
      <div
        aria-label="내 인터뷰 탭"
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {tabs.map((tab, index) => (
          <SegmentButton
            key={tab.value}
            buttonRef={(node) => {
              tabRefs.current[index] = node;
            }}
            count={tab.count}
            id={`my-interviews-tab-${tab.value}`}
            isActive={activeTab === tab.value}
            label={tab.label}
            panelId={`my-interviews-panel-${tab.value}`}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleTabKeyDown(event, index, onChange, tabRefs, tabs)}
          />
        ))}
      </div>
    </section>
  );
}

function handleTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  onChange: (tab: MyInterviewTab) => void,
  tabRefs: MutableRefObject<Array<HTMLButtonElement | null>>,
  tabs: MyInterviewsTabMeta[],
) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    return;
  }

  event.preventDefault();

  if (event.key === "Home") {
    onChange(tabs[0].value);
    tabRefs.current[0]?.focus();
    return;
  }

  if (event.key === "End") {
    const lastIndex = tabs.length - 1;
    onChange(tabs[lastIndex].value);
    tabRefs.current[lastIndex]?.focus();
    return;
  }

  const nextIndex =
    event.key === "ArrowRight"
      ? (index + 1) % tabs.length
      : (index - 1 + tabs.length) % tabs.length;

  onChange(tabs[nextIndex].value);
  tabRefs.current[nextIndex]?.focus();
}

interface SegmentButtonProps {
  buttonRef: (node: HTMLButtonElement | null) => void;
  count: number;
  id: string;
  isActive: boolean;
  label: string;
  panelId: string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function SegmentButton({
  buttonRef,
  count,
  id,
  isActive,
  label,
  panelId,
  onClick,
  onKeyDown,
}: SegmentButtonProps) {
  return (
    <button
      ref={buttonRef}
      aria-controls={panelId}
      aria-selected={isActive}
      className={cn(
        "ui-control-text inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-hypo-lg border px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
        isActive
          ? "border-hypo-brand bg-hypo-surface text-hypo-brand"
          : "border-hypo-border bg-hypo-surface text-hypo-text-muted hover:border-hypo-brand/40 hover:text-hypo-text",
      )}
      id={id}
      role="tab"
      tabIndex={isActive ? 0 : -1}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {label}
      <span
        className={cn(
          "grid min-w-5 place-items-center rounded-hypo-md px-1.5 text-[11px]",
          isActive
            ? "bg-hypo-brand-soft text-hypo-brand"
            : "bg-hypo-surface-muted text-hypo-text-soft",
        )}
      >
        {count}
      </span>
    </button>
  );
}
