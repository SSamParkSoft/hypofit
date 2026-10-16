import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { adminApi } from "../../../shared/api/admin";
import type { AdminNotice, NoticeType } from "../../../shared/api/types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { formatDateTime, getErrorMessage } from "../adminViewModel";

interface Props {
  accessToken: string; notices: AdminNotice[]; onChanged: (message: string) => void; onError: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void; onBusyChange?: (busy: boolean) => void;
}
const typeLabels: Record<NoticeType, string> = { GENERAL: "일반", MAINTENANCE: "점검", IMPORTANT: "중요 안내" };
const statusLabels = { DRAFT: "초안", PUBLISHED: "게시 중", ARCHIVED: "보관" };

export function NoticePanel({ accessToken, notices, onChanged, onError, onDirtyChange, onBusyChange }: Props) {
  const [editing, setEditing] = useState<AdminNotice | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NoticeType>("GENERAL");
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const lock = useRef(false);
  const dirty = title !== (editing?.title ?? "") || body !== (editing?.body ?? "") || type !== (editing?.type ?? "GENERAL");
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(pending); return () => onBusyChange?.(false); }, [pending, onBusyChange]);

  const open = (notice: AdminNotice | null) => {
    if (lock.current || (dirty && !window.confirm("저장하지 않은 내용을 버릴까요?"))) return;
    setEditing(notice); setTitle(notice?.title ?? ""); setBody(notice?.body ?? ""); setType(notice?.type ?? "GENERAL"); setValidation(null); setPreview(false);
  };
  const save = async () => {
    if (lock.current) return;
    if (!title.trim() || !body.trim()) { setValidation("제목과 내용을 입력해 주세요."); return; }
    if (editing?.status === "PUBLISHED" && !window.confirm("게시 중인 공지 내용을 변경할까요? 사용자에게 바로 반영됩니다.")) return;
    lock.current = true; setPending(true); setValidation(null);
    try {
      const input = { type, title: title.trim(), body: body.trim() };
      const result = editing ? await adminApi.updateNotice(editing.id, input, accessToken) : await adminApi.createNotice(input, accessToken);
      setEditing(result); setTitle(result.title); setBody(result.body); setType(result.type);
      onChanged(editing ? "공지 내용을 저장했어요." : "공지 초안을 만들었어요.");
    } catch (error) { onError(getErrorMessage(error, "공지사항을 저장하지 못했습니다.")); }
    finally { lock.current = false; setPending(false); }
  };
  const transition = async (notice: AdminNotice, action: "publish" | "archive") => {
    if (lock.current) return;
    const copy = action === "archive" ? `“${notice.title}” 공지를 보관할까요? 사용자 목록에서 숨겨집니다.`
      : `“${notice.title}” 공지를 게시할까요?${notice.type === "IMPORTANT" ? " 앱에서 중요 안내 팝업이 표시됩니다." : " 사용자에게 공개됩니다."}`;
    if (!window.confirm(copy)) return;
    lock.current = true; setPending(true);
    try {
      const result = action === "publish" ? await adminApi.publishNotice(notice.id, accessToken) : await adminApi.archiveNotice(notice.id, accessToken);
      if (editing?.id === notice.id) setEditing(result);
      onChanged(action === "publish" ? "공지를 게시했어요." : "공지를 보관했어요.");
    } catch (error) { onError(getErrorMessage(error, "공지 상태를 바꾸지 못했습니다.")); }
    finally { lock.current = false; setPending(false); }
  };
  const readOnly = editing?.status === "ARCHIVED" || editing?.managed_by_maintenance;
  const remove = async (notice: AdminNotice) => {
    if (lock.current || dirty || notice.managed_by_maintenance) return;
    if (!window.confirm(`“${notice.title}” 공지를 삭제할까요? 공지 목록에서 제거되며 복구할 수 없어요.`)) return;
    lock.current = true; setPending(true);
    try {
      await adminApi.deleteNotice(notice.id, accessToken);
      if (editing?.id === notice.id) {
        setEditing(null); setTitle(""); setBody(""); setType("GENERAL"); setPreview(false); setValidation(null);
      }
      onChanged("공지를 삭제했어요.");
    } catch (error) { onError(getErrorMessage(error, "공지사항을 삭제하지 못했습니다.")); }
    finally { lock.current = false; setPending(false); }
  };
  return <div className="space-y-5">
    <section className="border-b border-hypo-border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{editing ? "공지 수정" : "공지 작성"}</h2><Button size="sm" variant="secondary" disabled={pending} onClick={() => open(null)}>새 공지</Button></div>
      {editing?.managed_by_maintenance ? <p className="mt-3 text-sm text-hypo-text-muted">연결된 점검 안내는 서비스 운영에서 수정해 주세요.</p> : null}
      <fieldset disabled={pending || readOnly} className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm font-medium">공지 유형<select className="rounded-hypo-md border border-hypo-border px-3 py-2" value={type} onChange={(event) => setType(event.target.value as NoticeType)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium">공지 제목<input name="title" maxLength={160} required className="rounded-hypo-md border border-hypo-border px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <p className="text-xs text-hypo-text-muted">{title.length}/160</p>
        <label className="grid gap-2 text-sm font-medium">공지 내용<textarea name="body" required className="min-h-40 rounded-hypo-md border border-hypo-border px-3 py-2 leading-6" value={body} onChange={(event) => setBody(event.target.value)} /></label>
      </fieldset>
      {validation ? <p role="alert" className="mt-2 text-sm text-hypo-danger">{validation}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3"><Button disabled={pending || readOnly || !dirty} onClick={() => void save()}>{pending ? "저장 중" : editing ? "변경 저장" : "초안 만들기"}</Button><Button variant="secondary" onClick={() => setPreview((value) => !value)}>{preview ? "미리보기 닫기" : "미리보기"}</Button></div>
      {preview ? <article className="mt-5 border-t border-hypo-border pt-5"><p className="text-sm text-hypo-text-muted">{typeLabels[type]}</p><h3 className="mt-2 break-words text-xl font-bold">{title || "제목 없음"}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{body || "내용 없음"}</p></article> : null}
    </section>
    <section><h2 className="px-5 py-3 font-bold">공지사항</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-hypo-border"><tr><th className="px-5 py-3">제목</th><th className="py-3">유형·상태</th><th className="px-3 py-3">수정 시각</th><th className="px-3 py-3">공지 관리</th></tr></thead><tbody>{notices.map((notice) => <tr key={notice.id} className="border-b border-hypo-border"><td className="px-5 py-4"><button type="button" disabled={pending} className="break-words text-left font-bold hover:text-hypo-brand" onClick={() => open(notice)}>{notice.title}</button></td><td className="py-4"><p>{typeLabels[notice.type]}</p><Badge>{statusLabels[notice.status]}</Badge></td><td className="px-3 py-4 text-hypo-text-muted">{formatDateTime(notice.updated_at)}</td><td className="px-3 py-4"><div className="flex gap-3">{notice.status === "DRAFT" ? <Button disabled={pending || dirty} size="sm" onClick={() => void transition(notice, "publish")}>게시</Button> : null}{notice.status !== "ARCHIVED" ? <Button disabled={pending || dirty || notice.managed_by_maintenance} size="sm" variant="secondary" onClick={() => void transition(notice, "archive")}>보관</Button> : null}<Button aria-label={`${notice.title} 공지 삭제`} title={notice.managed_by_maintenance ? "점검에 연결된 공지는 삭제할 수 없어요." : "공지 삭제"} disabled={pending || dirty || notice.managed_by_maintenance} size="sm" variant="outlineDanger" onClick={() => void remove(notice)}><Trash2 size={14} aria-hidden="true" />삭제</Button></div></td></tr>)}</tbody></table></div>{notices.length === 0 ? <p className="px-5 py-8 text-sm text-hypo-text-muted">등록한 공지사항이 없어요.</p> : null}</section>
  </div>;
}
