import type { AdminSummary } from "../../../shared/api/types";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { getReadinessIntent } from "../adminViewModel";

interface HealthPanelProps {
  health: AdminSummary["health"] | null;
  healthJson: Record<string, unknown> | null;
  onRefresh: () => void;
}

export function HealthPanel({ health, healthJson, onRefresh }: HealthPanelProps) {
  return (
    <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">상태 점검</h2>
          <p className="text-sm text-hypo-text-muted">API, DB, 이메일, 푸시 설정을 확인합니다.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          새로고침
        </Button>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3">
        <ReadinessItem label="API" value={health?.api ?? "unknown"} />
        <ReadinessItem label="DB" value={health?.database ?? "unknown"} />
        <ReadinessItem label="푸시" value={health?.push ?? "unknown"} />
        <ReadinessItem label="이메일" value={health?.outbound_email ?? "unknown"} />
      </div>
      <details className="mt-4 rounded-hypo-lg border border-hypo-border bg-hypo-surface-muted">
        <summary className="cursor-pointer px-4 py-3 text-sm font-black">원본 readiness JSON</summary>
        <pre className="max-h-[520px] overflow-auto border-t border-hypo-border bg-[#10201B] p-4 text-xs leading-5 text-white">
          {healthJson ? JSON.stringify(healthJson, null, 2) : "상태를 불러오는 중입니다."}
        </pre>
      </details>
    </section>
  );
}

function ReadinessItem({ label, value }: { label: string; value: string }) {
  const intent = getReadinessIntent(value);

  return (
    <div className="rounded-hypo-lg border border-hypo-border bg-white px-4 py-3">
      <p className="text-xs font-bold text-hypo-text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-black",
          intent === "success"
            ? "text-hypo-success"
            : intent === "warning"
              ? "text-hypo-warning"
              : "text-hypo-text",
        )}
      >
        {value}
      </p>
    </div>
  );
}
