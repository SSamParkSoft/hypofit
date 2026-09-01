import { Clock3, MapPin, MonitorUp } from "lucide-react";

import type { InterviewPost } from "../../../shared/api/types";
import { cn } from "../../../shared/ui/cn";
import { CompensationSummary, PostingTypeLabel, postingParticipationLabel } from "./postingPresentation";

interface OpportunityCardProps {
  isSelected?: boolean;
  isViewed?: boolean;
  onSelect: () => void;
  post: InterviewPost;
  variant?: "default" | "compact";
}

export function OpportunityCard({
  isSelected,
  isViewed,
  onSelect,
  post,
  variant = "default",
}: OpportunityCardProps) {
  const locationOrSchedule = post.location ?? post.schedule_options[0] ?? "조건 확인";
  const isCompact = variant === "compact";

  return (
    <button
      aria-pressed={Boolean(isSelected)}
      className={cn(
        "relative w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
        isCompact ? "px-4 py-3.5 sm:px-5" : "px-4 py-4 sm:px-5",
        "before:absolute before:inset-y-4 before:left-0 before:w-0.5 before:rounded-full before:bg-transparent",
        isSelected ? "bg-hypo-brand-soft/35 before:bg-hypo-brand" : "hover:bg-hypo-bg",
      )}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5 flex min-w-0 items-center gap-2">
            <PostingTypeLabel post={post} />
          </div>
          <h3
            className={cn(
              "truncate text-[15px] font-semibold leading-6",
              isViewed && !isSelected ? "text-hypo-text-muted" : "text-hypo-text",
            )}
          >
            {post.title}
          </h3>
          <p
            className={cn(
              "mt-1 line-clamp-1 text-sm leading-5",
              isViewed && !isSelected ? "text-hypo-text-soft" : "text-hypo-text-muted",
            )}
          >
            {post.target_description}
          </p>
        </div>
        <strong
          className={cn(
            "shrink-0 text-[13px] font-semibold leading-6 tabular-nums sm:text-sm",
            isViewed && !isSelected ? "text-hypo-text-soft" : "text-hypo-reward",
          )}
        >
          <CompensationSummary post={post} />
        </strong>
      </div>

      <div
        className={cn(
          "mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-5",
          isViewed && !isSelected ? "text-hypo-text-soft/80" : "text-hypo-text-soft",
        )}
      >
        <span className="inline-flex items-center gap-1">
          <MonitorUp size={13} />
          {postingParticipationLabel(post)}
        </span>
        {!isCompact ? (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock3 size={13} />
            {post.duration_minutes}분
          </span>
        ) : null}
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin size={13} />
          <span className="truncate">{locationOrSchedule}</span>
        </span>
      </div>
    </button>
  );
}
