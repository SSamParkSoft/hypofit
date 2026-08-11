import type { ReactNode } from "react";

interface MyInterviewsDetailHeaderProps {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function MyInterviewsDetailHeader({
  action,
  description,
  eyebrow,
  title,
}: MyInterviewsDetailHeaderProps) {
  return (
    <div className="grid gap-2 px-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-hypo-text-soft">{eyebrow}</p>
          <h3 className="ui-row-title mt-1 text-hypo-text">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-hypo-text-muted">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
