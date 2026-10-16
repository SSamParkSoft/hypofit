import type { AdminSummary } from "../../../shared/api/types";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { formatDateTime, getReadinessIntent, readinessValues } from "../adminViewModel";

interface HealthPanelProps {
  health: AdminSummary["health"] | null;
  healthJson: Record<string, unknown> | null;
  onRefresh: () => void;
  isLoading?: boolean;
  checkedAt?: number;
  error?: string | null;
}

export function HealthPanel({ healthJson, onRefresh, isLoading, checkedAt, error }: HealthPanelProps) {
  const values = readinessValues(healthJson);
  return (
    <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">상태 점검</h2>
          <p className="text-sm text-hypo-text-muted">API·DB 연결과 공급자 설정을 확인합니다. 공급자 설정 여부는 실제 발송 성공을 보장하지 않습니다.</p>
        </div>
        <Button variant="secondary" size="sm" disabled={isLoading} onClick={onRefresh}>
          새로고침
        </Button>
      </div>
      <p role="status" className="mt-3 text-xs text-hypo-text-muted">{isLoading ? "확인 중" : checkedAt ? `${error ? "직전 확인" : "확인 시각"}: ${formatDateTime(new Date(checkedAt).toISOString())}` : "확인되지 않음"}</p>
      {error ? <p role="alert" className="mt-2 text-sm text-hypo-danger">{error}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <ReadinessItem label="API" value={values.api} stale={Boolean(error)} />
        <ReadinessItem label="DB" value={values.database} stale={Boolean(error)} />
        <ReadinessItem label="APNs 설정" value={values.apns} stale={Boolean(error)} />
        <ReadinessItem label="FCM 설정" value={values.fcm} stale={Boolean(error)} />
        <ReadinessItem label="이메일 설정" value={values.email} stale={Boolean(error)} />
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

function ReadinessItem({ label, value, stale }: { label: string; value: string; stale: boolean }) {
  const intent = stale ? "neutral" : getReadinessIntent(value);

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
