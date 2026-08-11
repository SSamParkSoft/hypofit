import type { AdminSummary } from "../../../shared/api/types";

interface AdminSummaryStripProps {
  summary: AdminSummary;
}

export function AdminSummaryStrip({ summary }: AdminSummaryStripProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <SummaryItem label="열린 티켓" value={summary.support.open} />
      <SummaryItem label="검토 중" value={summary.support.in_review} />
      <SummaryItem label="열린 신고" value={summary.support.reports_open} />
      <SummaryItem label="계정삭제 큐" value={summary.support.account_deletion_open} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-hypo-lg border border-hypo-border bg-white px-4 py-3">
      <p className="text-xs font-bold text-hypo-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
