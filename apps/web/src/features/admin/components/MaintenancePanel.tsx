import { useMemo, useState } from "react";

import { adminApi } from "../../../shared/api/admin";
import type { AdminMaintenance } from "../../../shared/api/types";
import { formatDateTime } from "../adminViewModel";

interface Props {
  accessToken: string;
  maintenances: AdminMaintenance[];
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}

type DurationPreset = "UNKNOWN" | "30" | "60" | "120" | "CUSTOM";

const emergencyMessage = "안정적인 서비스 제공을 위해 긴급 점검을 진행하고 있어요.";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function toTimeInputValue(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function joinLocalDateTime(date: string, time: string) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`);
}

function toIso(date: string, time: string) {
  const value = joinLocalDateTime(date, time);
  return value?.toISOString() ?? null;
}

function endFromPreset(start: Date | null, preset: DurationPreset) {
  if (!start || !["30", "60", "120"].includes(preset)) return null;
  return new Date(start.getTime() + Number(preset) * 60 * 1000);
}

function statusLabel(status: AdminMaintenance["status"]) {
  return {
    SCHEDULED: "점검 예정",
    IN_PROGRESS: "점검 중",
    VERIFYING: "정상화 확인 중",
    COMPLETED: "완료",
    CANCELLED: "취소됨",
  }[status];
}

function DurationPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DurationPreset;
  onChange: (value: DurationPreset) => void;
}) {
  const labels: Record<DurationPreset, string> = {
    "30": "30분",
    "60": "1시간",
    "120": "2시간",
    UNKNOWN: "미정",
    CUSTOM: "직접 설정",
  };
  return <fieldset className="grid gap-2"><legend className="text-sm font-bold">{label}</legend><div className="flex flex-wrap gap-2">{(Object.keys(labels) as DurationPreset[]).map((preset) => <button key={preset} type="button" onClick={() => onChange(preset)} className={`rounded-hypo-md border px-3 py-2 text-sm font-bold ${value === preset ? "border-hypo-brand bg-hypo-brand-soft text-hypo-brand" : "border-hypo-border bg-white"}`}>{labels[preset]}</button>)}</div></fieldset>;
}

function DateTimeFields({
  date,
  time,
  dateLabel,
  timeLabel,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  dateLabel: string;
  timeLabel: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">{dateLabel}<input type="date" className="rounded-hypo-md border border-hypo-border bg-white px-3 py-2 font-normal" value={date} onChange={(event) => onDateChange(event.target.value)} /></label><label className="grid gap-2 text-sm font-bold">{timeLabel}<input type="time" className="rounded-hypo-md border border-hypo-border bg-white px-3 py-2 font-normal" value={time} onChange={(event) => onTimeChange(event.target.value)} /></label></div>;
}

export function MaintenancePanel({ accessToken, maintenances, onChanged, onError }: Props) {
  const initialSchedule = useMemo(() => new Date(Date.now() + 60 * 60 * 1000), []);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [startsDate, setStartsDate] = useState(() => toDateInputValue(initialSchedule));
  const [startsTime, setStartsTime] = useState(() => toTimeInputValue(initialSchedule));
  const [durationPreset, setDurationPreset] = useState<DurationPreset>("120");
  const [customEndsDate, setCustomEndsDate] = useState("");
  const [customEndsTime, setCustomEndsTime] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [createNotice, setCreateNotice] = useState(true);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyTitle, setEmergencyTitle] = useState("긴급 시스템 점검");
  const [emergencyMessageValue, setEmergencyMessageValue] = useState(emergencyMessage);
  const [emergencyDuration, setEmergencyDuration] = useState<DurationPreset>("60");
  const [emergencyCustomEndsDate, setEmergencyCustomEndsDate] = useState("");
  const [emergencyCustomEndsTime, setEmergencyCustomEndsTime] = useState("");
  const [pending, setPending] = useState(false);

  const active = maintenances.find((item) => item.status === "IN_PROGRESS" || item.status === "VERIFYING");
  const scheduledStart = joinLocalDateTime(startsDate, startsTime);
  const scheduledEnd = durationPreset === "CUSTOM" ? joinLocalDateTime(customEndsDate, customEndsTime) : endFromPreset(scheduledStart, durationPreset);
  const emergencyEnd = emergencyDuration === "CUSTOM" ? joinLocalDateTime(emergencyCustomEndsDate, emergencyCustomEndsTime) : endFromPreset(new Date(), emergencyDuration);

  const createScheduled = async () => {
    const startsAt = toIso(startsDate, startsTime);
    if (!title.trim() || !message.trim() || !startsAt) { onError("점검 제목, 안내 문구, 시작 날짜와 시간을 입력해 주세요."); return; }
    if (scheduledEnd && scheduledEnd <= new Date(startsAt)) { onError("종료 예정 시간은 시작 시간 이후로 설정해 주세요."); return; }
    setPending(true);
    try {
      await adminApi.createMaintenance({ title: title.trim(), message: message.trim(), starts_at: startsAt, ends_at: scheduledEnd?.toISOString() ?? null, show_banner: showBanner, banner_starts_at: showBanner ? startsAt : null, create_notice: createNotice }, accessToken);
      setTitle(""); setMessage(""); onChanged("점검을 예약했어요.");
    } catch { onError("점검을 예약하지 못했습니다."); } finally { setPending(false); }
  };

  const startEmergency = async () => {
    if (!emergencyTitle.trim() || !emergencyMessageValue.trim()) { onError("점검 제목과 사용자 안내를 입력해 주세요."); return; }
    if (emergencyEnd && emergencyEnd <= new Date()) { onError("종료 예정 시간은 현재 시간 이후로 설정해 주세요."); return; }
    if (!window.confirm("긴급 점검을 즉시 시작할까요? 일반 사용자의 서비스 이용이 바로 제한됩니다.")) return;
    setPending(true);
    try {
      await adminApi.emergencyStartMaintenance({ title: emergencyTitle.trim(), message: emergencyMessageValue.trim(), ends_at: emergencyEnd?.toISOString() ?? null, create_notice: true }, accessToken);
      setEmergencyOpen(false); onChanged("긴급 점검을 시작했어요. 일반 사용자 요청은 점검 화면으로 전환됩니다.");
    } catch { onError("긴급 점검을 시작하지 못했습니다. 이미 진행 중인 점검이 있는지 확인해 주세요."); } finally { setPending(false); }
  };

  const transition = async (item: AdminMaintenance, action: "start" | "verify" | "complete" | "cancel") => {
    const copy = { start: "점검을 시작하면 일반 사용자의 서비스 이용이 제한됩니다. 시작할까요?", verify: "정상화 확인 단계로 전환할까요? 점검 화면은 계속 표시됩니다.", complete: "정상 운영 상태로 전환할까요? 일반 사용자가 서비스를 다시 이용할 수 있습니다.", cancel: "예정된 점검과 사전 안내를 취소할까요?" }[action];
    if (!window.confirm(copy)) return;
    setPending(true);
    try { await adminApi.transitionMaintenance(item.id, action, accessToken); onChanged("점검 상태를 변경했어요."); } catch { onError("점검 상태를 변경하지 못했습니다."); } finally { setPending(false); }
  };

  return <div className="space-y-6">
    {active ? <section className="border border-hypo-brand/30 bg-hypo-brand-soft px-5 py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-black text-hypo-brand">{statusLabel(active.status)}</p><h2 className="mt-1 text-xl font-black">{active.title}</h2><p className="mt-2 text-sm text-hypo-text-muted">시작 {formatDateTime(active.started_at ?? active.starts_at)}{active.ends_at ? ` · 종료 예정 ${formatDateTime(active.ends_at)}` : " · 종료 시간 미정"}</p></div>{active.status === "IN_PROGRESS" ? <button type="button" disabled={pending} className="rounded-hypo-md border border-hypo-brand bg-white px-4 py-2 text-sm font-black text-hypo-brand disabled:opacity-50" onClick={() => void transition(active, "verify")}>정상화 확인</button> : <button type="button" disabled={pending} className="rounded-hypo-md bg-hypo-brand px-4 py-2 text-sm font-black text-white disabled:opacity-50" onClick={() => void transition(active, "complete")}>점검 종료</button>}</div></section> : <section className="border border-amber-300 bg-amber-50 px-5 py-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-black text-amber-800">긴급 대응</p><h2 className="mt-1 text-xl font-black">즉시 점검 시작</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-hypo-text-muted">예약 없이 바로 전체 서비스 점검 화면을 표시합니다. 일반 사용자의 API 요청은 즉시 제한돼요.</p></div><button type="button" disabled={pending} onClick={() => setEmergencyOpen((value) => !value)} className="rounded-hypo-md bg-hypo-brand px-4 py-2 text-sm font-black text-white disabled:opacity-50">{emergencyOpen ? "닫기" : "긴급 점검 시작"}</button></div>{emergencyOpen ? <div className="mt-5 grid max-w-3xl gap-4 border-t border-amber-200 pt-5"><label className="grid gap-2 text-sm font-bold">점검 제목<input className="rounded-hypo-md border border-hypo-border bg-white px-3 py-2 font-normal" value={emergencyTitle} onChange={(event) => setEmergencyTitle(event.target.value)} /></label><label className="grid gap-2 text-sm font-bold">사용자 안내<textarea className="min-h-24 rounded-hypo-md border border-hypo-border bg-white px-3 py-2 font-normal" value={emergencyMessageValue} onChange={(event) => setEmergencyMessageValue(event.target.value)} /></label><DurationPicker label="예상 종료" value={emergencyDuration} onChange={setEmergencyDuration} />{emergencyDuration === "CUSTOM" ? <DateTimeFields date={emergencyCustomEndsDate} time={emergencyCustomEndsTime} dateLabel="종료 날짜" timeLabel="종료 시간" onDateChange={setEmergencyCustomEndsDate} onTimeChange={setEmergencyCustomEndsTime} /> : null}<p className="text-xs leading-5 text-hypo-text-muted">긴급 점검 공지는 함께 게시됩니다. 실제 서버 또는 DB 작업이 필요한 경우에는 별도로 Nginx hard-maintenance 절차도 실행해야 해요.</p><div><button type="button" disabled={pending} onClick={() => void startEmergency()} className="rounded-hypo-md bg-hypo-brand px-4 py-2 font-black text-white disabled:opacity-50">{pending ? "점검 시작 중" : "지금 점검 시작"}</button></div></div> : null}</section>}

    <section className="border border-hypo-border bg-white p-5"><div><p className="text-sm font-black text-hypo-brand">예정 작업</p><h2 className="mt-1 text-xl font-black">점검 예약</h2><p className="mt-2 text-sm text-hypo-text-muted">날짜와 시간을 따로 정하고 예상 소요 시간을 선택하세요.</p></div><div className="mt-5 grid max-w-3xl gap-4"><label className="grid gap-2 text-sm font-bold">점검 제목<input className="rounded-hypo-md border border-hypo-border px-3 py-2 font-normal" placeholder="예: 시스템 안정화 점검" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="grid gap-2 text-sm font-bold">사용자 안내<textarea className="min-h-24 rounded-hypo-md border border-hypo-border px-3 py-2 font-normal" placeholder="점검 중 사용자에게 보여줄 안내를 입력해 주세요." value={message} onChange={(event) => setMessage(event.target.value)} /></label><DateTimeFields date={startsDate} time={startsTime} dateLabel="시작 날짜" timeLabel="시작 시간" onDateChange={setStartsDate} onTimeChange={setStartsTime} /><DurationPicker label="예상 소요 시간" value={durationPreset} onChange={setDurationPreset} />{durationPreset === "CUSTOM" ? <DateTimeFields date={customEndsDate} time={customEndsTime} dateLabel="종료 날짜" timeLabel="종료 시간" onDateChange={setCustomEndsDate} onTimeChange={setCustomEndsTime} /> : null}<label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={showBanner} onChange={(event) => setShowBanner(event.target.checked)} />앱 상단에 점검 예정 안내를 표시해요</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={createNotice} onChange={(event) => setCreateNotice(event.target.checked)} />점검 공지를 함께 게시해요</label><div><button type="button" disabled={pending} onClick={() => void createScheduled()} className="rounded-hypo-md bg-hypo-brand px-4 py-2 font-black text-white disabled:opacity-50">{pending ? "저장 중" : "점검 예약"}</button></div></div></section>

    <section className="overflow-hidden border border-hypo-border bg-white"><div className="border-b border-hypo-border px-5 py-4"><h2 className="font-black">점검 이력</h2></div>{maintenances.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-hypo-border px-5 py-4 last:border-0"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.title}</p><span className="rounded-hypo-md bg-hypo-surface-muted px-2 py-1 text-xs font-bold text-hypo-text-muted">{statusLabel(item.status)}</span></div><p className="mt-1 text-sm text-hypo-text-muted">{formatDateTime(item.starts_at)}{item.ends_at ? ` ~ ${formatDateTime(item.ends_at)}` : " · 종료 시간 미정"}</p></div>{item.status === "SCHEDULED" ? <><button type="button" disabled={pending || Boolean(active)} className="text-sm font-black text-hypo-brand disabled:opacity-40" onClick={() => void transition(item, "start")}>점검 시작</button><button type="button" disabled={pending} className="text-sm font-black text-red-600 disabled:opacity-40" onClick={() => void transition(item, "cancel")}>취소</button></> : null}{item.status === "IN_PROGRESS" ? <button type="button" disabled={pending} className="text-sm font-black text-hypo-brand disabled:opacity-40" onClick={() => void transition(item, "verify")}>정상화 확인</button> : null}{item.status === "VERIFYING" ? <button type="button" disabled={pending} className="text-sm font-black text-hypo-brand disabled:opacity-40" onClick={() => void transition(item, "complete")}>점검 종료</button> : null}</div>)}{maintenances.length === 0 ? <p className="px-5 py-10 text-sm text-hypo-text-muted">등록한 점검이 없어요.</p> : null}</section>
  </div>;
}
