import { Flag, Mail, Send, ShieldAlert } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { useAuth } from "../features/auth/useAuth";
import { useCreateSupportTicket } from "../features/support/useSupportTickets";
import type { SupportTicketCategory, SupportTicketTargetType } from "../shared/api/types";
import { supportEmail } from "../shared/config/support";
import { navigateBack } from "../shared/navigation/appNavigation";
import { BackLink } from "../shared/ui/back-link";
import { Button } from "../shared/ui/button";
import { Field, SelectInput, TextareaInput, TextInput } from "../shared/ui/field";
import { PageLayout } from "../shared/ui/page";
import { ErrorState } from "../shared/ui/state";

const reportCategories: Array<{ label: string; value: SupportTicketCategory }> = [
  { label: "모집글", value: "interview_post" },
  { label: "채팅", value: "chat" },
  { label: "개인정보 요구", value: "privacy" },
  { label: "부적절한 내용", value: "abuse" },
  { label: "불참", value: "no_show" },
  { label: "기타", value: "other" },
];

export function ReportPage() {
  const { appUser, user } = useAuth();
  const context = useMemo(getReportContext, []);
  const createTicket = useCreateSupportTicket();
  const [category, setCategory] = useState<SupportTicketCategory>(
    context.category ?? (context.targetType === "chat_room" ? "chat" : "abuse"),
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [contactEmail, setContactEmail] = useState(appUser?.email ?? user?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (body.trim().length < 5) {
      setError("신고 내용을 5자 이상 입력해 주세요.");
      return;
    }
    if (!contactEmail.trim()) {
      setError("답변 받을 이메일을 입력해 주세요.");
      return;
    }

    try {
      await createTicket.mutateAsync({
        body: body.trim(),
        category,
        contact_email: contactEmail.trim(),
        kind: "report",
        metadata: {
          source: "web_report",
          raw_target_id: context.rawTargetId,
          counterpart_name: context.counterpartName,
          interview_title: context.interviewTitle,
        },
        subject: subject.trim() || null,
        target_id: context.targetId,
        target_type: context.targetType,
      });
      setIsComplete(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "신고를 접수하지 못했어요.");
    }
  }

  return (
    <main className="min-h-dvh bg-hypo-bg text-hypo-text">
      <PageLayout variant="form">
        <header className="flex min-w-0 items-start gap-3">
          <BackLink className="mt-0.5" href="/profile" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-8">신고하기</h1>
            <p className="mt-1 text-sm leading-6 text-hypo-text-muted">
              부적절한 모집글, 채팅, 개인정보 요구나 인터뷰 문제를 알려주세요.
            </p>
          </div>
        </header>

        <div className="grid gap-5 min-[1080px]:grid-cols-[minmax(0,720px)_minmax(280px,340px)] min-[1080px]:items-start min-[1080px]:justify-between">
          <section className="overflow-hidden border-y border-hypo-border bg-hypo-surface sm:border">
            {isComplete ? (
              <div className="grid min-h-[420px] place-items-center px-5 py-10 text-center">
                <div className="max-w-sm">
                  <Flag aria-hidden="true" className="mx-auto text-hypo-brand" size={24} />
                  <h2 className="mt-5 text-xl font-bold leading-7">신고가 접수됐어요</h2>
                  <p className="mt-2 text-sm leading-6 text-hypo-text-muted">
                    운영팀이 정책 위반 여부와 필요한 조치를 확인해요.
                  </p>
                  <Button className="mt-6" onClick={() => navigateBack("/profile")}>프로필로 돌아가기</Button>
                </div>
              </div>
            ) : (
              <form className="grid gap-5 p-4 sm:p-6" onSubmit={(event) => void handleSubmit(event)}>
                {context.interviewTitle || context.counterpartName ? (
                  <div className="border-l-2 border-hypo-brand bg-hypo-brand-soft/60 px-3.5 py-3 text-sm font-semibold leading-6 text-hypo-brand">
                    {[context.counterpartName, context.interviewTitle].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
                {error ? <ErrorState title="입력한 내용을 확인해 주세요.">{error}</ErrorState> : null}
                <Field label="신고 유형">
                  <SelectInput value={category} onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}>
                    {reportCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectInput>
                </Field>
                <Field hint="선택 입력" label="제목">
                  <TextInput
                    maxLength={140}
                    placeholder="예: 채팅에서 외부 연락을 강요했어요"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </Field>
                <Field label="신고 내용">
                  <TextareaInput
                    className="min-h-44 resize-y"
                    maxLength={2000}
                    minLength={5}
                    placeholder="어떤 문제가 있었는지 관련 상황을 구체적으로 적어주세요."
                    required
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </Field>
                <Field label="답변 받을 이메일">
                  <TextInput
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                  />
                </Field>
                <div className="flex flex-wrap justify-end gap-2 border-t border-hypo-border pt-5">
                  <Button disabled={createTicket.isPending} onClick={() => navigateBack("/profile")} variant="secondary">취소</Button>
                  <Button disabled={createTicket.isPending} type="submit">
                    <Send aria-hidden="true" size={16} />
                    {createTicket.isPending ? "접수 중" : "신고하기"}
                  </Button>
                </div>
              </form>
            )}
          </section>

          <aside className="border-t border-hypo-border pt-5 min-[1080px]:border-t-0 min-[1080px]:pt-0">
            <div className="flex gap-3">
              <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0 text-hypo-brand" size={20} />
              <div>
                <h2 className="text-sm font-semibold leading-5">신고 내용은 운영팀이 확인해요</h2>
                <p className="mt-2 text-sm leading-6 text-hypo-text-muted">
                  사실 관계와 정책 위반 여부를 확인한 뒤 필요한 조치를 진행합니다. 처리 과정의 민감한 내부 정보는 공개되지 않을 수 있어요.
                </p>
              </div>
            </div>
            <div className="mt-5 border-t border-hypo-border pt-5">
              <p className="text-xs font-semibold leading-[18px] text-hypo-text-soft">긴급한 계정 문의</p>
              <a className="mt-2 inline-flex items-center gap-2 break-all text-sm font-semibold text-hypo-brand hover:underline" href={`mailto:${supportEmail}`}>
                <Mail aria-hidden="true" size={16} />{supportEmail}
              </a>
            </div>
          </aside>
        </div>
      </PageLayout>
    </main>
  );
}

function getReportContext(): {
  category: SupportTicketCategory | null;
  counterpartName: string | null;
  interviewTitle: string | null;
  rawTargetId: string | null;
  targetId: string | null;
  targetType: SupportTicketTargetType | null;
} {
  if (typeof window === "undefined") {
    return { category: null, counterpartName: null, interviewTitle: null, rawTargetId: null, targetId: null, targetType: null };
  }

  const params = new URLSearchParams(window.location.search);
  const rawTargetId = params.get("target_id");
  const rawTargetType = params.get("target_type");
  const rawCategory = params.get("category");

  return {
    category: isReportCategory(rawCategory) ? rawCategory : null,
    counterpartName: params.get("counterpart_name"),
    interviewTitle: params.get("interview_title"),
    rawTargetId,
    targetId: rawTargetId && isUuid(rawTargetId) ? rawTargetId : null,
    targetType: isTargetType(rawTargetType) ? rawTargetType : null,
  };
}

function isReportCategory(value: string | null): value is SupportTicketCategory {
  return reportCategories.some((option) => option.value === value);
}

function isTargetType(value: string | null): value is SupportTicketTargetType {
  return ["application", "chat_room", "chat_message", "interview_post", "session", "user"].includes(value ?? "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
