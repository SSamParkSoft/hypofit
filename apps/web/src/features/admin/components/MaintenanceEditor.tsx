import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { adminApi } from "../../../shared/api/admin";
import type { AdminMaintenance } from "../../../shared/api/types";
import { Button } from "../../../shared/ui/button";
import { formatDateTime, getErrorMessage } from "../adminViewModel";

interface Props {
  adminId?: string;
  accessToken: string;
  maintenance: AdminMaintenance;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}

function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const eventLabels: Record<string, string> = {
  MAINTENANCE_CREATED: "예약 등록", MAINTENANCE_UPDATED: "안내 수정", MAINTENANCE_STARTED: "점검 시작",
  MAINTENANCE_EMERGENCY_STARTED: "긴급 점검 시작", MAINTENANCE_VERIFYING: "정상화 확인", MAINTENANCE_COMPLETED: "점검 완료", MAINTENANCE_CANCELLED: "예약 취소",
};

function changedFields(before: string | null, after: string | null) {
  const labels: Record<string, string> = { status: "상태", title: "제목", message: "안내 문구", starts_at: "시작 예정", ends_at: "종료 예정", show_banner: "사전 배너", banner_starts_at: "배너 시작" };
  try {
    const previous = before ? JSON.parse(before) as Record<string, unknown> : {};
    const next = after ? JSON.parse(after) as Record<string, unknown> : {};
    return Object.keys(next).filter((key) => previous[key] !== next[key]).map((key) => labels[key] ?? key).join(" · ");
  } catch { return "상세 변경 기록을 확인하지 못했습니다."; }
}

export function MaintenanceEditor({ adminId, accessToken, maintenance, onChanged, onError, onClose, onDirtyChange, onBusyChange }: Props) {
  const [base, setBase] = useState(maintenance);
  const [title, setTitle] = useState(maintenance.title);
  const [message, setMessage] = useState(maintenance.message);
  const [start, setStart] = useState(localInput(maintenance.starts_at));
  const [end, setEnd] = useState(localInput(maintenance.ends_at));
  const [showBanner, setShowBanner] = useState(maintenance.show_banner);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const dirty = title !== base.title || message !== base.message || start !== localInput(base.starts_at) || end !== localInput(base.ends_at) || showBanner !== base.show_banner;
  const editable = ["SCHEDULED", "IN_PROGRESS", "VERIFYING"].includes(base.status);
  const active = base.status !== "SCHEDULED";
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(pending); return () => onBusyChange?.(false); }, [pending, onBusyChange]);
  const history = useQuery({
    queryKey: ["admin", adminId ?? "unknown-user", "api", "maintenance-events", maintenance.id, maintenance.version, base.version],
    queryFn: ({ signal }) => adminApi.listMaintenanceEvents(maintenance.id, accessToken, signal),
  });
  const save = async () => {
    if (lock.current) return;
    if (!start || !Number.isFinite(new Date(start).getTime()) || (end && !Number.isFinite(new Date(end).getTime()))) {
      setError("시작·종료 날짜와 시간을 모두 확인해 주세요."); return;
    }
    const startsAt = active || start === localInput(base.starts_at) ? base.starts_at : new Date(start).toISOString();
    const endsAt = end === localInput(base.ends_at) ? base.ends_at : end ? new Date(end).toISOString() : null;
    if (!title.trim() || !message.trim() || !start || (endsAt && new Date(endsAt) <= new Date(startsAt))) {
      setError("제목·안내·시작 시간을 입력하고 종료 시간을 시작 이후로 정해 주세요."); return;
    }
    if (!window.confirm("점검 안내를 저장할까요? 연결된 공지와 사용자 점검 화면에도 반영됩니다.")) return;
    lock.current = true; setPending(true); setError(null);
    try {
      const result = await adminApi.updateMaintenance(base.id, {
        title: title.trim(), message: message.trim(), starts_at: startsAt, ends_at: endsAt,
        show_banner: showBanner, banner_starts_at: showBanner ? base.banner_starts_at ?? new Date().toISOString() : null,
        expected_version: base.version,
      }, accessToken);
      setBase(result); setTitle(result.title); setMessage(result.message); setStart(localInput(result.starts_at)); setEnd(localInput(result.ends_at)); setShowBanner(result.show_banner);
      onChanged("점검 안내를 저장했어요.");
    } catch (failure) {
      const text = getErrorMessage(failure, "점검 안내를 저장하지 못했습니다. 최신 상태를 다시 확인해 주세요.");
      setError(text); onError(text);
    } finally { lock.current = false; setPending(false); }
  };
  const close = () => { if (!lock.current && (!dirty || window.confirm("저장하지 않은 변경을 버릴까요?"))) onClose(); };
  const dateFields = (value: string, update: (value: string) => void, prefix: string, disabled: boolean) => <div className="grid gap-3 sm:grid-cols-2">
    <label className="grid gap-2 text-sm font-medium">{prefix} 날짜<input type="date" disabled={disabled} className="rounded-hypo-md border border-hypo-border px-3 py-2" value={value.split("T")[0] ?? ""} onChange={(event) => update(event.target.value ? `${event.target.value}T${value.split("T")[1] || "09:00"}` : "")} /></label>
    <label className="grid gap-2 text-sm font-medium">{prefix} 시간<input type="time" disabled={disabled} className="rounded-hypo-md border border-hypo-border px-3 py-2" value={value.split("T")[1] ?? ""} onChange={(event) => update(`${value.split("T")[0] || localInput(new Date().toISOString()).split("T")[0]}T${event.target.value}`)} /></label>
  </div>;
  return <section className="border border-hypo-border bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{editable ? "점검 안내 수정" : "점검 상세"}</h2><Button variant="secondary" size="sm" disabled={pending} onClick={close}>닫기</Button></div>
    <p className="mt-2 text-xs text-hypo-text-muted">입력 시간대: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
    <fieldset disabled={pending || !editable} className="mt-4 grid max-w-3xl gap-4">
      <label className="grid gap-2 text-sm font-medium">점검 제목 수정<input maxLength={160} className="rounded-hypo-md border border-hypo-border px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="grid gap-2 text-sm font-medium">점검 안내 수정<textarea className="min-h-24 rounded-hypo-md border border-hypo-border px-3 py-2" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      {dateFields(start, setStart, "수정 시작", active)}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!end} onChange={(event) => setEnd(event.target.checked ? "" : localInput(new Date(Date.now() + 60 * 60 * 1000).toISOString()))} />종료 시간 미정</label>
      {end ? dateFields(end, setEnd, "수정 종료", false) : null}
      {!active ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showBanner} onChange={(event) => setShowBanner(event.target.checked)} />사전 배너 표시</label> : null}
    </fieldset>
    {error ? <p role="alert" className="mt-3 text-sm text-hypo-danger">{error}</p> : null}
    {editable ? <Button className="mt-4" disabled={pending || !dirty} onClick={() => void save()}>{pending ? "저장 중" : "점검 안내 저장"}</Button> : null}
    <h3 className="mt-6 border-t border-hypo-border pt-5 font-bold">운영 변경 이력</h3>
    {history.isFetching ? <p role="status" className="mt-3 text-sm">이력 확인 중</p> : null}
    {history.error ? <div role="alert" className="mt-3 text-sm"><p>운영 이력을 불러오지 못했습니다.</p><Button variant="secondary" size="sm" onClick={() => { void history.refetch(); }}>이력 다시 확인</Button></div> : null}
    <ol className="mt-3 divide-y divide-hypo-border">{history.data?.map((event) => <li key={event.id} className="py-3 text-sm"><p className="font-medium">{eventLabels[event.action] ?? event.action}</p><p className="mt-1 text-hypo-text-muted">{event.actorName ?? event.actorId ?? "운영자 기록 없음"} · {formatDateTime(event.createdAt)}</p><p className="mt-1 text-xs text-hypo-text-muted">{changedFields(event.before, event.after)}</p></li>)}</ol>
    {history.data?.length === 0 ? <p className="mt-3 text-sm text-hypo-text-muted">운영 기록이 없습니다.</p> : null}
    <p className="mt-2 text-xs text-hypo-text-muted">최근 변경 100건</p>
  </section>;
}
