interface OpportunityListSkeletonProps {
  count?: number;
  label?: string;
}

export function OpportunityListSkeleton({
  count = 4,
  label = "모집글을 불러오는 중입니다.",
}: OpportunityListSkeletonProps) {
  return (
    <div
      aria-atomic="true"
      aria-busy="true"
      aria-label={label}
      className="divide-y divide-hypo-border"
      role="status"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="grid min-h-[92px] gap-2 px-4 py-4 motion-safe:animate-pulse sm:px-5"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="h-4 w-3/5 rounded-hypo-sm bg-hypo-surface-muted" />
            <span className="h-4 w-16 rounded-hypo-sm bg-hypo-surface-muted" />
          </div>
          <span className="h-3 w-4/5 rounded-hypo-sm bg-hypo-surface-muted" />
          <div className="flex gap-3">
            <span className="h-3 w-14 rounded-hypo-sm bg-hypo-surface-muted" />
            <span className="h-3 w-12 rounded-hypo-sm bg-hypo-surface-muted" />
            <span className="h-3 w-20 rounded-hypo-sm bg-hypo-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
