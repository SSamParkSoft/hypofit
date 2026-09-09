import { Button } from "../../shared/ui/button";
import { useMaintenance } from "./MaintenanceProvider";

export function MaintenanceScreen() {
  const { errorMessage, isRefreshing, refresh, status } = useMaintenance();
  const title = status.status === "VERIFYING" ? "정상 동작을 확인하고 있어요" : status.title ?? "서비스 점검 중이에요";
  const message = status.message ?? "안정적인 서비스 제공을 위해 시스템을 점검하고 있어요.";

  return (
    <main className="min-h-dvh bg-hypo-bg px-4 pb-[calc(var(--app-safe-bottom)+1.5rem)] pt-[calc(var(--app-safe-top)+1.5rem)] text-hypo-text sm:px-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-3rem)] w-full max-w-[480px] place-items-center">
        <section className="w-full text-center">
          <img alt="" aria-hidden="true" className="mx-auto size-16 object-contain" src="/brand/hypofit-mark.svg" />
          <h1 className="mt-7 text-[28px] font-black leading-[1.28] text-hypo-text sm:text-[32px]">{title}</h1>
          <p className="mx-auto mt-3 max-w-[340px] text-[15px] font-medium leading-6 text-hypo-text-muted sm:text-base">{message}</p>

          {status.endsAt ? (
            <section className="mt-8 border border-hypo-border bg-hypo-surface px-5 py-4 text-left" aria-label="예상 점검 종료 시간">
              <p className="ui-metadata text-hypo-text-soft">예상 점검 종료 시간</p>
              <p className="mt-1 text-[15px] font-bold leading-6 text-hypo-text">{formatMaintenanceEnd(status.endsAt)}</p>
              <p className="mt-1 text-[13px] font-medium leading-5 text-hypo-text-muted">점검이 일찍 끝나면 바로 이용할 수 있어요.</p>
            </section>
          ) : null}

          <div className="mt-10 grid gap-3">
            {errorMessage ? <p className="text-sm font-medium leading-5 text-hypo-text-muted" role="status">{errorMessage}</p> : null}
            <Button className="w-full" disabled={isRefreshing} size="lg" onClick={() => void refresh()}>
              {isRefreshing ? "확인 중" : "다시 확인"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatMaintenanceEnd(endsAt: string) {
  const ends = new Date(endsAt);
  if (Number.isNaN(ends.getTime())) {
    return "종료 예정 시간을 확인하고 있어요.";
  }

  const date = new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
  }).format(ends);

  return `${date} 종료 예정`;
}
