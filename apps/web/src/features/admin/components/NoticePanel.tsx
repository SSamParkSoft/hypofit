import { useState } from "react";
import { adminApi } from "../../../shared/api/admin";
import type { AdminNotice, NoticeType } from "../../../shared/api/types";

interface Props { accessToken: string; notices: AdminNotice[]; onChanged: (message: string) => void; onError: (message: string) => void; }

export function NoticePanel({ accessToken, notices, onChanged, onError }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NoticeType>("GENERAL");
  const [pending, setPending] = useState(false);
  const create = async () => {
    if (!title.trim() || !body.trim()) { onError("제목과 내용을 입력해 주세요."); return; }
    setPending(true);
    try { await adminApi.createNotice({ title: title.trim(), body: body.trim(), type }, accessToken); setTitle(""); setBody(""); onChanged("공지 초안을 만들었어요."); }
    catch { onError("공지사항을 저장하지 못했습니다."); } finally { setPending(false); }
  };
  const update = async (id: string, action: "publish" | "archive") => {
    if (action === "archive" && !window.confirm("이 공지사항을 보관할까요?")) return;
    try {
      if (action === "publish") {
        await adminApi.publishNotice(id, accessToken);
      } else {
        await adminApi.archiveNotice(id, accessToken);
      }
      onChanged(action === "publish" ? "공지를 게시했어요." : "공지를 보관했어요.");
    } catch {
      onError("공지 상태를 바꾸지 못했습니다.");
    }
  };
  return <div className="space-y-5"><section className="rounded-hypo-lg border border-hypo-border bg-white p-5"><h2 className="text-lg font-black">공지 작성</h2><div className="mt-4 grid gap-3"><select aria-label="공지 유형" className="rounded-hypo-md border border-hypo-border px-3 py-2" value={type} onChange={(event) => setType(event.target.value as NoticeType)}><option value="GENERAL">일반</option><option value="MAINTENANCE">점검</option><option value="IMPORTANT">중요 안내</option></select><input className="rounded-hypo-md border border-hypo-border px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="공지 제목"/><textarea className="min-h-32 rounded-hypo-md border border-hypo-border px-3 py-2" value={body} onChange={(event) => setBody(event.target.value)} placeholder="사용자에게 보여줄 내용을 입력해 주세요."/><div><button type="button" disabled={pending} onClick={() => void create()} className="rounded-hypo-md bg-hypo-brand px-4 py-2 font-black text-white disabled:opacity-50">{pending ? "저장 중" : "초안 만들기"}</button></div></div></section><section className="overflow-hidden rounded-hypo-lg border border-hypo-border bg-white"><div className="border-b border-hypo-border px-5 py-4"><h2 className="font-black">공지사항</h2></div>{notices.map((notice) => <div key={notice.id} className="flex items-center gap-4 border-b border-hypo-border px-5 py-4 last:border-0"><div className="min-w-0 flex-1"><p className="font-black">{notice.title}</p><p className="mt-1 text-sm text-hypo-text-muted">{notice.type} · {notice.status}</p></div>{notice.status === "DRAFT" ? <button type="button" onClick={() => void update(notice.id, "publish")} className="text-sm font-black text-hypo-brand">게시</button> : null}{notice.status !== "ARCHIVED" ? <button type="button" onClick={() => void update(notice.id, "archive")} className="text-sm font-black text-red-600">보관</button> : null}</div>)}{notices.length === 0 ? <p className="px-5 py-10 text-sm text-hypo-text-muted">등록한 공지사항이 없어요.</p> : null}</section></div>;
}
