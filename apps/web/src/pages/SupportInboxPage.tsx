import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  MessageCircleQuestion,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useCreateSupportTicket,
  useDeleteSupportTicket,
  useSupportTickets,
  useUpdateSupportTicket,
} from "../features/support/useSupportTickets";
import { useAuth } from "../features/auth/useAuth";
import type { SupportTicket, SupportTicketCategory, SupportTicketStatus } from "../shared/api/types";
import { getApiErrorMessage } from "../shared/api/errorPresentation";
import { supportEmail } from "../shared/config/support";
import { navigateBack, navigateTo, replacePath } from "../shared/navigation/appNavigation";
import { useRouteMetadata } from "../shared/navigation/useRouteMetadata";
import { BackLink } from "../shared/ui/back-link";
import { Button } from "../shared/ui/button";
import { cn } from "../shared/ui/cn";
import { ConfirmActionButton } from "../shared/ui/confirm-action";
import { Field, SelectInput, TextareaInput, TextInput } from "../shared/ui/field";
import { AppIcon } from "../shared/ui/icon";
import { PageHeader, PageLayout } from "../shared/ui/page";
import { EmptyState, ErrorState, LoadingState } from "../shared/ui/state";

const categoryOptions: Array<{ label: string; value: SupportTicketCategory }> = [
  { label: "계정과 로그인", value: "account" },
  { label: "모집글", value: "interview_post" },
  { label: "신청과 선정", value: "application" },
  { label: "채팅", value: "chat" },
  { label: "일정과 사례비", value: "reward" },
  { label: "개인정보", value: "privacy" },
  { label: "기타", value: "other" },
];

const statusLabels: Record<SupportTicketStatus, string> = {
  open: "접수",
  in_review: "확인 중",
  resolved: "답변 완료",
  closed: "종료",
};

const DESKTOP_LIST_DETAIL_MEDIA_QUERY = "(min-width: 1200px)";
const inboxSurfaceClassName =
  "min-h-[560px] overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface shadow-hypo-panel min-[1200px]:grid min-[1200px]:grid-cols-[370px_minmax(0,1fr)]";

type SupportInboxMode = "detail" | "list" | "new";

interface SupportInboxPageProps {
  mode: SupportInboxMode;
  ticketId?: string;
}

export function SupportInboxPage({ mode, ticketId }: SupportInboxPageProps) {
  useRouteMetadata({ robots: "noindex,nofollow" });
  const { appUser, user } = useAuth();
  const ticketsQuery = useSupportTickets(undefined, null);
  const createTicket = useCreateSupportTicket();
  const updateTicket = useUpdateSupportTicket();
  const deleteTicket = useDeleteSupportTicket();
  const [isEditing, setIsEditing] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const allTickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);
  const tickets = useMemo(
    () => [...allTickets]
      .filter((ticket) => ticket.kind === "inquiry")
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [allTickets],
  );
  const selectedTicket = ticketId ? allTickets.find((ticket) => ticket.id === ticketId) ?? null : null;
  const accountEmail = appUser?.email ?? user?.email ?? "";

  useEffect(() => {
    setIsEditing(false);
    setMutationError(null);
  }, [ticketId]);

  async function handleDelete(ticket: SupportTicket) {
    setMutationError(null);
    try {
      await deleteTicket.mutateAsync(ticket.id);
      replacePath("/support/inquiries", { intent: "replace" });
    } catch (error) {
      setMutationError(getApiErrorMessage(error, "문의를 삭제하지 못했어요."));
    }
  }

  return (
    <main className="min-h-dvh bg-hypo-bg text-hypo-text">
      <PageLayout className="min-[1200px]:gap-6" variant="list-detail">
        <div className="flex min-w-0 items-start gap-3">
          <BackLink className="mt-1" href="/profile" />
          <div className="min-w-0 flex-1">
            <PageHeader
              action={
                <Button onClick={() => navigateTo("/support/inquiries/new")}>
                  <Plus aria-hidden="true" size={17} />
                  새 문의
                </Button>
              }
              description="접수한 문의와 운영팀 답변을 확인할 수 있어요."
              title="문의하기"
            />
          </div>
        </div>

        <section className={inboxSurfaceClassName}>
          <div
            className={cn(
              "min-w-0 min-[1200px]:border-r min-[1200px]:border-hypo-border/70",
              mode !== "list" && "hidden min-[1200px]:block",
            )}
          >
            <InquiryList
              isError={ticketsQuery.isError}
              isLoading={ticketsQuery.isLoading}
              selectedTicketId={ticketId}
              tickets={tickets}
              onRetry={() => void ticketsQuery.refetch()}
            />
          </div>

          <div className={cn("min-w-0", mode === "list" && "hidden min-[1200px]:block")}>
            {mode === "new" ? (
              <InquiryComposer
                accountEmail={accountEmail}
                isPending={createTicket.isPending}
                onCancel={() => navigateBack("/support/inquiries")}
                onSubmit={async (values) => {
                  const created = await createTicket.mutateAsync({
                    ...values,
                    contact_email: accountEmail || supportEmail,
                    kind: "inquiry",
                    metadata: { source: "web_support_inbox" },
                  });
                  replacePath(`/support/inquiries/${created.id}`, { intent: "replace" });
                }}
              />
            ) : mode === "detail" ? (
              ticketsQuery.isLoading ? (
                <div className="p-5"><LoadingState title="문의 내용을 불러오는 중입니다." /></div>
              ) : selectedTicket ? (
                isEditing ? (
                  <InquiryComposer
                    accountEmail={accountEmail}
                    initialTicket={selectedTicket}
                    isPending={updateTicket.isPending}
                    onCancel={() => setIsEditing(false)}
                    onSubmit={async (values) => {
                      await updateTicket.mutateAsync({
                        input: { ...values, contact_email: accountEmail || selectedTicket.contact_email },
                        ticketId: selectedTicket.id,
                      });
                      setIsEditing(false);
                    }}
                  />
                ) : (
                  <InquiryDetail
                    error={mutationError}
                    ticket={selectedTicket}
                    onDelete={() => void handleDelete(selectedTicket)}
                    onEdit={() => setIsEditing(true)}
                  />
                )
              ) : (
                <div className="p-5 sm:p-8">
                  <ErrorState title="문의를 찾지 못했어요.">
                    본인이 접수한 문의인지 확인해 주세요.
                    <Button className="mt-4" onClick={() => replacePath("/support/inquiries")} variant="secondary">
                      문의 목록 보기
                    </Button>
                  </ErrorState>
                </div>
              )
            ) : (
              <div className="hidden min-h-[560px] place-items-center p-8 min-[1200px]:grid">
                <div className="max-w-sm text-center">
                  <Inbox aria-hidden="true" className="mx-auto text-hypo-text-soft" size={24} />
                  <h2 className="mt-4 text-base font-semibold">확인할 문의를 선택해 주세요</h2>
                  <p className="mt-2 text-sm leading-6 text-hypo-text-muted">
                    문의 내용과 운영팀 답변을 한 화면에서 확인할 수 있어요.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </PageLayout>
    </main>
  );
}

function InquiryList({
  isError,
  isLoading,
  onRetry,
  selectedTicketId,
  tickets,
}: {
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  selectedTicketId?: string;
  tickets: SupportTicket[];
}) {
  if (isLoading) {
    return <div className="p-4"><LoadingState title="문의 내역을 불러오는 중입니다." /></div>;
  }

  if (isError) {
    return (
      <div className="p-4">
        <ErrorState title="문의 내역을 불러오지 못했어요.">
          <Button className="mt-4" onClick={onRetry} size="sm" variant="secondary">다시 불러오기</Button>
        </ErrorState>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="p-4 sm:p-5">
        <EmptyState
          action={{ label: "첫 문의 남기기", onClick: () => navigateTo("/support/inquiries/new") }}
          title="아직 문의한 내역이 없어요."
        >
          계정, 신청, 모집글 문제가 생기면 운영팀에 남겨주세요.
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-hypo-border/70 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold leading-[18px] text-hypo-text-soft">내 문의 {tickets.length}건</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-hypo-text">
              최근 업데이트 순으로 확인할 수 있어요
            </p>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-hypo-brand-soft/80 text-hypo-brand">
            <AppIcon aria-hidden="true" name="notification" size={16} />
          </span>
        </div>
      </div>
      <div>
        {tickets.map((ticket) => {
          const selected = ticket.id === selectedTicketId;
          return (
            <a
              key={ticket.id}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "group relative grid min-h-[108px] grid-cols-[minmax(0,1fr)_20px] items-center gap-3 border-b border-hypo-border/70 px-4 py-4 transition-colors hover:bg-hypo-surface-muted/70 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20",
                selected && "bg-hypo-brand-soft/60",
              )}
              href={`/support/inquiries/${ticket.id}`}
              onClick={(event) => handleInquiryRowNavigation(event, ticket.id)}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <SupportStatus status={ticket.status} />
                  <span className="truncate text-xs font-medium leading-[18px] text-hypo-text-soft">
                    {getCategoryLabel(ticket.category)}
                  </span>
                </span>
                <strong className="mt-2 block truncate text-[15px] font-semibold leading-[22px] text-hypo-text">
                  {getTicketTitle(ticket)}
                </strong>
                <span className="mt-1.5 flex items-center gap-1.5 text-xs font-medium leading-[18px] text-hypo-text-muted">
                  <Clock3 aria-hidden="true" size={13} />
                  {formatDateTime(ticket.updated_at)}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="text-hypo-text-soft group-hover:text-hypo-brand" size={18} />
            </a>
          );
        })}
      </div>
    </div>
  );
}

function handleInquiryRowNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  ticketId: string,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    typeof window.matchMedia !== "function" ||
    !window.matchMedia(DESKTOP_LIST_DETAIL_MEDIA_QUERY).matches
  ) {
    return;
  }

  event.preventDefault();
  replacePath(`/support/inquiries/${ticketId}`, {
    focus: "none",
    intent: "state",
    scroll: "preserve",
  });
}

function InquiryDetail({
  error,
  onDelete,
  onEdit,
  ticket,
}: {
  error: string | null;
  onDelete: () => void;
  onEdit: () => void;
  ticket: SupportTicket;
}) {
  const canChange = ticket.kind === "inquiry" && ticket.status === "open";

  return (
    <article className="min-h-[560px]">
      <div className="border-b border-hypo-border/70 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3 min-[1200px]:hidden">
          <BackLink href="/support/inquiries" />
          <div className="min-w-0 pt-1">
            <p className="text-sm font-semibold">문의 상세</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 min-[1200px]:mt-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SupportStatus status={ticket.status} />
              <span className="text-xs font-bold text-hypo-text-muted">{getCategoryLabel(ticket.category)}</span>
            </div>
            <h2 className="mt-3 break-words text-xl font-bold leading-7 sm:text-2xl sm:leading-8">{getTicketTitle(ticket)}</h2>
            <p className="mt-2 text-xs font-normal leading-[18px] text-hypo-text-muted">
              {formatDateTime(ticket.created_at)} 접수 · {formatDateTime(ticket.updated_at)} 업데이트
            </p>
          </div>
          {canChange ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button onClick={onEdit} size="sm" variant="secondary">
                <Pencil aria-hidden="true" size={15} />수정
              </Button>
              <ConfirmActionButton
                confirmLabel="삭제하기"
                description="삭제한 문의와 답변은 다시 확인할 수 없어요."
                onConfirm={onDelete}
                size="sm"
                title="문의를 삭제할까요?"
                variant="outlineDanger"
              >
                <Trash2 aria-hidden="true" size={15} />삭제
              </ConfirmActionButton>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 px-4 py-6 sm:px-6 sm:py-7">
        {error ? <ErrorState title="요청을 처리하지 못했어요.">{error}</ErrorState> : null}
        <section aria-labelledby="inquiry-body-title">
          <p id="inquiry-body-title" className="text-xs font-semibold leading-[18px] text-hypo-text-soft">
            {ticket.kind === "report" ? "내가 남긴 신고" : "내가 남긴 문의"}
          </p>
          <div className="mt-3 rounded-hypo-lg border border-hypo-border/70 bg-hypo-bg/55 px-4 py-4">
            <p className="whitespace-pre-wrap break-words text-[15px] font-normal leading-7 text-hypo-text">
              {ticket.body}
            </p>
          </div>
        </section>

        <section className="border-t border-hypo-border/70 pt-7" aria-labelledby="inquiry-replies-title">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion aria-hidden="true" className="text-hypo-brand" size={18} />
            <h3 id="inquiry-replies-title" className="text-base font-semibold leading-6">
              {ticket.kind === "report" ? "운영팀 안내" : "운영팀 답변"}
            </h3>
          </div>
          {ticket.replies.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="rounded-hypo-lg border border-hypo-brand/15 bg-hypo-brand-soft/55 px-4 py-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-xs font-semibold leading-[18px] text-hypo-brand">Hypofit 운영팀</strong>
                    <span className="text-xs font-normal leading-[18px] text-hypo-text-muted">{formatDateTime(reply.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-hypo-text">
                    {reply.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-hypo-lg border border-hypo-border/70 bg-hypo-bg/45 px-4 py-5">
              <p className="text-sm leading-6 text-hypo-text-muted">
                아직 등록된 답변이 없어요. 남겨주신 내용은 운영팀이 순서대로 확인해요.
              </p>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

function InquiryComposer({
  accountEmail,
  initialTicket,
  isPending,
  onCancel,
  onSubmit,
}: {
  accountEmail: string;
  initialTicket?: SupportTicket;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (values: { body: string; category: SupportTicketCategory; subject: string | null }) => Promise<void>;
}) {
  const [category, setCategory] = useState<SupportTicketCategory>(initialTicket?.category ?? "account");
  const [subject, setSubject] = useState(initialTicket?.subject ?? "");
  const [body, setBody] = useState(initialTicket?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBodyError(null);

    if (body.trim().length < 5) {
      const nextError = "문의 내용을 5자 이상 입력해 주세요.";
      setError(nextError);
      setBodyError(nextError);
      window.requestAnimationFrame(() => document.getElementById("support-inquiry-body")?.focus());
      return;
    }

    try {
      await onSubmit({ body: body.trim(), category, subject: subject.trim() || null });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "문의를 저장하지 못했어요.");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-hypo-border/70 px-4 py-4 sm:px-6">
        <button
          aria-label="문의 목록으로 돌아가기"
          className="grid size-9 place-items-center rounded-hypo-md text-hypo-text-muted hover:bg-hypo-surface-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          onClick={onCancel}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={17} />
        </button>
        <div>
          <h2 className="text-lg font-bold leading-7">{initialTicket ? "문의 수정" : "새 문의"}</h2>
          <p className="mt-1 text-xs font-normal leading-[18px] text-hypo-text-muted">
            답변은 {accountEmail || "가입 이메일"} 기준으로 확인할 수 있어요.
          </p>
        </div>
      </div>
      <form className="grid max-w-[720px] gap-5 px-4 py-6 sm:px-6 sm:py-7" onSubmit={(event) => void handleSubmit(event)}>
        {error ? <ErrorState title="입력한 내용을 확인해 주세요.">{error}</ErrorState> : null}
        <Field label="유형">
          <SelectInput value={category} onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}>
            {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
        </Field>
        <Field hint="선택 입력" label="제목">
          <TextInput
            maxLength={140}
            placeholder="예: 신청 상태가 바뀌지 않아요"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </Field>
        <Field error={bodyError} label="문의 내용">
          <TextareaInput
            className="min-h-44 resize-y"
            id="support-inquiry-body"
            maxLength={2000}
            minLength={5}
            placeholder="어떤 문제가 있었는지와 필요한 도움을 적어주세요."
            required
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (bodyError) setBodyError(null);
            }}
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 border-t border-hypo-border/70 pt-5">
          <Button disabled={isPending} onClick={onCancel} variant="secondary">취소</Button>
          <Button disabled={isPending} type="submit">
            {initialTicket ? <FileText aria-hidden="true" size={16} /> : <Send aria-hidden="true" size={16} />}
            {isPending ? "저장 중" : initialTicket ? "저장하기" : "문의 남기기"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SupportStatus({ status }: { status: string }) {
  const normalized = status in statusLabels ? (status as SupportTicketStatus) : "open";
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2 text-[11px] font-semibold leading-4",
        normalized === "open" && "bg-hypo-brand-soft text-hypo-brand",
        normalized === "in_review" && "bg-amber-50 text-amber-800",
        normalized === "resolved" && "bg-emerald-50 text-emerald-800",
        normalized === "closed" && "bg-hypo-surface-muted text-hypo-text-muted",
      )}
    >
      {statusLabels[normalized]}
    </span>
  );
}

function getTicketTitle(ticket: SupportTicket) {
  return ticket.subject?.trim() || `${getCategoryLabel(ticket.category)} 문의`;
}

function getCategoryLabel(category: SupportTicketCategory) {
  return categoryOptions.find((option) => option.value === category)?.label ?? "기타";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
