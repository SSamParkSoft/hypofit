import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "../../../shared/api/admin";
import type { AdminMaintenance } from "../../../shared/api/types";
import { Button } from "../../../shared/ui/button";
import { formatDateTime, getErrorMessage } from "../adminViewModel";
import { MaintenanceEditor } from "./MaintenanceEditor";

interface Props {
  adminId?: string; accessToken: string; maintenances: AdminMaintenance[];
  onChanged: (message: string) => void; onError: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void; onBusyChange?: (busy: boolean) => void;
}
type DurationPreset = "UNKNOWN" | "30" | "60" | "120" | "CUSTOM";
const emergencyMessage = "안정적인 서비스 제공을 위해 긴급 점검을 진행하고 있어요.";
const statusLabels = { SCHEDULED: "점검 예정", IN_PROGRESS: "점검 중", VERIFYING: "정상화 확인 중", COMPLETED: "완료", CANCELLED: "취소됨" };
const inputClass = "rounded-hypo-md border border-hypo-border bg-white px-3 py-2 font-normal";
function pad(value: number) { return String(value).padStart(2, "0"); }
function dateInput(value: Date) { return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`; }
function timeInput(value: Date) { return `${pad(value.getHours())}:${pad(value.getMinutes())}`; }
function joinLocalDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const result = new Date(`${date}T${time}:00`);
  return Number.isFinite(result.getTime()) ? result : null;
}
function endFromPreset(start: Date | null, preset: DurationPreset) {
  return start && ["30", "60", "120"].includes(preset) ? new Date(start.getTime() + Number(preset) * 60 * 1000) : null;
}
function DurationPicker({ label, value, onChange }: { label: string; value: DurationPreset; onChange: (value: DurationPreset) => void }) {
  const labels: Record<DurationPreset, string> = { "30": "30분", "60": "1시간", "120": "2시간", UNKNOWN: "미정", CUSTOM: "직접 설정" };
  return <fieldset className="grid gap-2"><legend className="text-sm font-medium">{label}</legend><div className="flex flex-wrap gap-2">{(Object.keys(labels) as DurationPreset[]).map((preset) => <button key={preset} type="button" aria-pressed={value === preset} onClick={() => onChange(preset)} className={`rounded-hypo-md border px-3 py-2 text-sm ${value === preset ? "border-hypo-brand bg-hypo-brand-soft text-hypo-brand" : "border-hypo-border bg-white"}`}>{labels[preset]}</button>)}</div></fieldset>;
}
function DateTimeFields({ date, time, label, onDate, onTime }: { date: string; time: string; label: string; onDate: (value: string) => void; onTime: (value: string) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">{label} 날짜<input type="date" className={inputClass} value={date} onChange={(event) => onDate(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">{label} 시간<input type="time" className={inputClass} value={time} onChange={(event) => onTime(event.target.value)} /></label></div>;
}

export function MaintenancePanel({ adminId, accessToken, maintenances, onChanged, onError, onDirtyChange, onBusyChange }: Props) {
  const initial = useMemo(() => new Date(Date.now() + 60 * 60 * 1000), []);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [startsDate, setStartsDate] = useState(() => dateInput(initial));
  const [startsTime, setStartsTime] = useState(() => timeInput(initial));
  const [duration, setDuration] = useState<DurationPreset>("120");
  const [endsDate, setEndsDate] = useState("");
  const [endsTime, setEndsTime] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [createNotice, setCreateNotice] = useState(true);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyTitle, setEmergencyTitle] = useState("긴급 시스템 점검");
  const [emergencyText, setEmergencyText] = useState(emergencyMessage);
  const [emergencyDuration, setEmergencyDuration] = useState<DurationPreset>("60");
  const [emergencyEndDate, setEmergencyEndDate] = useState("");
  const [emergencyEndTime, setEmergencyEndTime] = useState("");
  const [pending, setPending] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminMaintenance | null>(null);
  const lock = useRef(false);
  const dirty = Boolean(title || message || emergencyOpen || startsDate !== dateInput(initial) || startsTime !== timeInput(initial) || duration !== "120" || endsDate || endsTime || !showBanner || !createNotice);
  useEffect(() => { if (!editing) onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, editing, onDirtyChange]);
  useEffect(() => { onBusyChange?.(pending); return () => onBusyChange?.(false); }, [pending, onBusyChange]);
  const active = maintenances.find((item) => ["IN_PROGRESS", "VERIFYING"].includes(item.status));
  const createScheduled = async () => {
    if (lock.current) return;
    const start = joinLocalDateTime(startsDate, startsTime);
    const end = duration === "CUSTOM" ? joinLocalDateTime(endsDate, endsTime) : endFromPreset(start, duration);
    if (!title.trim() || !message.trim() || !start) { setValidation("점검 제목, 안내 문구, 시작 날짜와 시간을 입력해 주세요."); return; }
    if (start <= new Date()) { setValidation("예약 시작 시간은 현재 이후로 정해 주세요."); return; }
    if ((duration === "CUSTOM" && !end) || (end && end <= start)) { setValidation("종료 예정 날짜와 시간을 시작 이후로 설정해 주세요."); return; }
    lock.current = true; setPending(true); setValidation(null);
    try {
      await adminApi.createMaintenance({ title: title.trim(), message: message.trim(), starts_at: start.toISOString(), ends_at: end?.toISOString() ?? null, show_banner: showBanner, banner_starts_at: showBanner ? new Date().toISOString() : null, create_notice: createNotice }, accessToken);
      setTitle(""); setMessage(""); setStartsDate(dateInput(initial)); setStartsTime(timeInput(initial)); setDuration("120"); setEndsDate(""); setEndsTime(""); setShowBanner(true); setCreateNotice(true); onChanged("점검을 예약했어요.");
    } catch (error) { onError(getErrorMessage(error, "점검을 예약하지 못했습니다.")); }
    finally { lock.current = false; setPending(false); }
  };
  const startEmergency = async () => {
    if (lock.current) return;
    const end = emergencyDuration === "CUSTOM" ? joinLocalDateTime(emergencyEndDate, emergencyEndTime) : endFromPreset(new Date(), emergencyDuration);
    if (!emergencyTitle.trim() || !emergencyText.trim()) { setValidation("점검 제목과 사용자 안내를 입력해 주세요."); return; }
    if ((emergencyDuration === "CUSTOM" && !end) || (end && end <= new Date())) { setValidation("종료 예정 날짜와 시간을 현재 이후로 정해 주세요."); return; }
    if (!window.confirm("긴급 점검을 즉시 시작할까요? 일반 사용자의 서비스 이용이 바로 제한됩니다.")) return;
    lock.current = true; setPending(true); setValidation(null);
    try { await adminApi.emergencyStartMaintenance({ title: emergencyTitle.trim(), message: emergencyText.trim(), ends_at: end?.toISOString() ?? null, create_notice: true }, accessToken); setEmergencyOpen(false); onChanged("긴급 점검을 시작했어요. 일반 사용자의 서비스 이용이 제한됩니다."); }
    catch (error) { onError(getErrorMessage(error, "긴급 점검을 시작하지 못했습니다. 현재 점검 상태를 확인해 주세요.")); }
    finally { lock.current = false; setPending(false); }
  };
  const transition = async (item: AdminMaintenance, action: "start" | "verify" | "complete" | "cancel") => {
    if (lock.current || (dirty && !window.confirm("작성 중인 내용은 아직 저장되지 않았습니다. 운영 작업을 계속할까요?"))) return;
    const copy = { start: "점검을 시작하면 일반 사용자의 서비스 이용이 제한됩니다. 시작할까요?", verify: "정상화 확인 단계로 전환할까요? 서비스 이용 제한은 유지됩니다.", complete: "정상 운영 상태로 전환할까요? 일반 사용자가 서비스를 다시 이용할 수 있습니다.", cancel: "예정된 점검과 사전 안내를 취소할까요?" }[action];
    if (!window.confirm(`${item.title}\n${copy}`)) return;
    lock.current = true; setPending(true);
    try { await adminApi.transitionMaintenance(item.id, action, accessToken); onChanged("점검 상태를 변경했어요."); }
    catch (error) { onError(getErrorMessage(error, "점검 상태를 변경하지 못했습니다.")); }
    finally { lock.current = false; setPending(false); }
  };
  const openEditor = (item: AdminMaintenance) => {
    if (lock.current || (dirty && !window.confirm("저장하지 않은 작성 내용을 버릴까요?"))) return;
    setTitle(""); setMessage(""); setStartsDate(dateInput(initial)); setStartsTime(timeInput(initial)); setDuration("120"); setEndsDate(""); setEndsTime(""); setShowBanner(true); setCreateNotice(true); setEmergencyOpen(false); setValidation(null); setEditing(item);
  };
  if (editing) return <MaintenanceEditor key={editing.id} adminId={adminId} accessToken={accessToken} maintenance={maintenances.find((item) => item.id === editing.id) ?? editing} onChanged={onChanged} onError={onError} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange} onClose={() => setEditing(null)} />;
  return <div className="space-y-6">
    {validation ? <p role="alert" className="text-sm text-hypo-danger">{validation}</p> : null}
    {active ? <section className="border-l-4 border-hypo-brand bg-white p-5"><p className="text-sm font-bold text-hypo-brand">{statusLabels[active.status]}</p><h2 className="mt-1 text-xl font-bold">{active.title}</h2><p className="mt-2 text-sm">시작 {formatDateTime(active.started_at ?? active.starts_at)} · {active.ends_at ? `종료 예정 ${formatDateTime(active.ends_at)}` : "종료 시간 미정"}</p><p className="mt-3 whitespace-pre-wrap text-sm text-hypo-text-muted">{active.message}</p><div className="mt-4 flex flex-wrap gap-3"><Button variant="secondary" size="sm" disabled={pending} onClick={() => openEditor(active)}>안내·종료 시간 수정</Button>{active.status === "IN_PROGRESS" ? <Button size="sm" disabled={pending} onClick={() => void transition(active, "verify")}>정상화 확인</Button> : null}<Button size="sm" disabled={pending} onClick={() => void transition(active, "complete")}>점검 종료</Button></div></section>
      : <section className="border-b border-hypo-border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-bold">즉시 점검 시작</h2><p className="mt-2 text-sm text-hypo-text-muted">일반 사용자의 서비스 이용을 바로 제한합니다.</p></div><Button disabled={pending} onClick={() => setEmergencyOpen((value) => !value)}>{emergencyOpen ? "닫기" : "긴급 점검 시작"}</Button></div>
        {emergencyOpen ? <fieldset disabled={pending} className="mt-5 grid max-w-3xl gap-4 border-t border-hypo-border pt-5"><label className="grid gap-2 text-sm font-medium">긴급 점검 제목<input maxLength={160} className={inputClass} value={emergencyTitle} onChange={(event) => setEmergencyTitle(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">긴급 사용자 안내<textarea className={`${inputClass} min-h-24`} value={emergencyText} onChange={(event) => setEmergencyText(event.target.value)} /></label><DurationPicker label="긴급 예상 종료" value={emergencyDuration} onChange={setEmergencyDuration} />{emergencyDuration === "CUSTOM" ? <DateTimeFields date={emergencyEndDate} time={emergencyEndTime} label="긴급 종료" onDate={setEmergencyEndDate} onTime={setEmergencyEndTime} /> : null}<p className="text-xs text-hypo-text-muted">긴급 점검 공지가 함께 게시됩니다. Spring·DB 중단 작업은 별도로 Nginx 점검 절차가 필요합니다.</p><div><Button disabled={pending} onClick={() => void startEmergency()}>{pending ? "점검 시작 중" : "지금 점검 시작"}</Button></div></fieldset> : null}
      </section>}
    <section className="border-b border-hypo-border bg-white p-5"><h2 className="text-lg font-bold">점검 예약</h2><p className="mt-2 text-xs text-hypo-text-muted">입력 시간대: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p><fieldset disabled={pending} className="mt-5 grid max-w-3xl gap-4">
      <label className="grid gap-2 text-sm font-medium">점검 제목<input maxLength={160} className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">사용자 안내<textarea className={`${inputClass} min-h-24`} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <DateTimeFields date={startsDate} time={startsTime} label="시작" onDate={setStartsDate} onTime={setStartsTime} /><DurationPicker label="예상 소요 시간" value={duration} onChange={setDuration} />{duration === "CUSTOM" ? <DateTimeFields date={endsDate} time={endsTime} label="종료" onDate={setEndsDate} onTime={setEndsTime} /> : null}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showBanner} onChange={(event) => setShowBanner(event.target.checked)} />앱 상단에 점검 예정 안내를 표시해요</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={createNotice} onChange={(event) => setCreateNotice(event.target.checked)} />점검 공지를 함께 게시해요</label><div><Button disabled={pending} onClick={() => void createScheduled()}>{pending ? "저장 중" : "점검 예약"}</Button></div>
    </fieldset></section>
    <section><h2 className="px-5 py-3 font-bold">점검 이력</h2>{maintenances.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-hypo-border px-5 py-4"><div className="min-w-0 flex-1"><p className="break-words font-bold">{item.title}</p><p className="mt-1 text-sm text-hypo-text-muted">{statusLabels[item.status]} · {formatDateTime(item.starts_at)} · {item.ends_at ? `종료 예정 ${formatDateTime(item.ends_at)}` : "종료 시간 미정"}</p></div><Button variant="secondary" size="sm" disabled={pending} onClick={() => openEditor(item)}>상세·이력</Button>{item.status === "SCHEDULED" ? <><Button size="sm" disabled={pending || Boolean(active)} onClick={() => void transition(item, "start")}>점검 시작</Button><Button variant="outlineDanger" size="sm" disabled={pending} onClick={() => void transition(item, "cancel")}>취소</Button></> : null}</div>)}{maintenances.length === 0 ? <p className="px-5 py-8 text-sm text-hypo-text-muted">등록한 점검이 없어요.</p> : null}</section>
  </div>;
}
