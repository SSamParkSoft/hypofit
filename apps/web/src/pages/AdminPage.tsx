import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  AccountDeletionDetailPanel, AccountDeletionListPanel, AdminAccessState, AdminSectionNavigation,
  AdminSummaryStrip, HealthPanel, PushPanel,
  SupportTicketDetailPanel, SupportTicketListPanel,
} from "../features/admin/components";
import { adminSections, getErrorMessage, type AdminSection } from "../features/admin/adminViewModel";
import { useAdminData } from "../features/admin/useAdminData";
import { adminApi } from "../shared/api/admin";
import { isApiError } from "../shared/api/client";
import type { AdminAccountDeletionRequest, AdminMe, SupportTicketStatus } from "../shared/api/types";
import { ErrorState, LoadingState } from "../shared/ui/state";
import { replacePath } from "../shared/navigation/appNavigation";

interface AdminPageProps { accessToken: string | null; userId?: string | null; }
const NoticePanel = lazy(() => import("../features/admin/components/NoticePanel").then((module) => ({ default: module.NoticePanel })));
const MaintenancePanel = lazy(() => import("../features/admin/components/MaintenancePanel").then((module) => ({ default: module.MaintenancePanel })));

export function AdminPage({ accessToken, userId }: AdminPageProps) {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [failure, setFailure] = useState<{ message: string; denied: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!accessToken) { setAdmin(null); return; }
    const controller = new AbortController();
    if (!userId) setAdmin(null);
    setFailure(null);
    adminApi.getMe(accessToken, controller.signal).then((value) => {
      if (!controller.signal.aborted) setAdmin(value);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setAdmin(null);
      setFailure({ message: getErrorMessage(error, "관리자 확인에 실패했습니다."), denied: isApiError(error) && (error.status === 401 || error.status === 403) });
    });
    return () => controller.abort();
  }, [accessToken, userId, attempt]);

  if (!accessToken) return <AdminAccessState title="로그인이 필요합니다." description="관리자 콘솔은 로그인 후 이용할 수 있습니다." />;
  if (failure) return <div><AdminAccessState title={failure.denied ? "관리자 권한이 필요합니다." : "관리자 확인을 다시 시도해 주세요."} description={failure.message} /><button className="mx-auto block rounded-hypo-md border border-hypo-border px-4 py-2" type="button" onClick={() => setAttempt((value) => value + 1)}>다시 시도</button></div>;
  if (!admin || (userId && admin.id !== userId)) return <LoadingState title="관리자 확인 중입니다." />;
  return <AdminConsole key={admin.id} admin={admin} accessToken={accessToken} />;
}

function initialSection(): AdminSection {
  const value = new URLSearchParams(window.location.search).get("section");
  return adminSections.find((item) => item.id === value)?.id ?? "tickets";
}

function AdminConsole({ admin, accessToken }: { admin: AdminMe; accessToken: string }) {
  const [section, setSection] = useState<AdminSection>(initialSection);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("ticket"));
  const [selectedDeletionId, setSelectedDeletionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "all">("open");
  const [deletedFilter, setDeletedFilter] = useState<"all" | "active" | "deleted">("active");
  const [deletionStatusFilter, setDeletionStatusFilter] = useState<AdminAccountDeletionRequest["status"] | "all">("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletionSearch, setDeletionSearch] = useState("");
  const [debouncedDeletionSearch, setDebouncedDeletionSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(ticketSearch), 300); return () => window.clearTimeout(timer); }, [ticketSearch]);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedDeletionSearch(deletionSearch), 300); return () => window.clearTimeout(timer); }, [deletionSearch]);
  const data = useAdminData({ adminId: admin.id, accessToken, section, selectedTicketId, statusFilter, deletedFilter, deletionStatusFilter, search: debouncedSearch, deletionSearch: debouncedDeletionSearch });
  const selectedDeletion = data.deletionRequests.find((request) => request.id === selectedDeletionId) ?? data.deletionRequests[0] ?? null;
  const canLeave = () => !busy && (!dirty || window.confirm("저장하지 않은 내용을 버리고 이동할까요?"));
  const writeLocation = (nextSection: AdminSection, ticketId: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.set("section", nextSection);
    if (ticketId) url.searchParams.set("ticket", ticketId); else url.searchParams.delete("ticket");
    replacePath(`${url.pathname}${url.search}${url.hash}`, { intent: "state", scroll: "preserve", focus: "none" });
  };
  const changeSection = (value: AdminSection) => {
    if (value === section || !canLeave()) return;
    setDirty(false); setActionError(null); setActionMessage(null); setSection(value); setSelectedTicketId(null);
    writeLocation(value, null);
  };
  const selectTicket = (id: string) => {
    if (id === data.selectedTicket?.id || !canLeave()) return;
    setDirty(false); setActionError(null); setActionMessage(null); setSelectedTicketId(id); writeLocation(section, id);
  };
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, busy]);
  const refresh = data.refresh;
  const onAction = useCallback((message: string) => { setActionError(null); setActionMessage(message); refresh(); }, [refresh]);
  const error = actionError ?? (data.error ? getErrorMessage(data.error, "데이터를 불러오지 못했습니다.") : null);

  return <div className="min-h-dvh bg-hypo-surface-muted text-hypo-text">
    <a href="#admin-content" className="sr-only focus:not-sr-only">운영 내용으로 이동</a>
    <header className="border-b border-hypo-border bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div><p className="text-sm font-bold text-hypo-brand">Hypofit Admin</p><h1 className="text-xl font-bold">운영 콘솔</h1></div>
        <div className="text-right text-sm"><p className="font-bold">{admin.name}</p><p className="break-all text-hypo-text-muted">{admin.email}</p><a className="text-hypo-brand underline" href="/app" onClick={(event) => { if (!canLeave()) event.preventDefault(); }}>서비스로 이동</a></div>
      </div>
    </header>
    <main className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[180px_minmax(0,1fr)]">
      <AdminSectionNavigation section={section} onSectionChange={changeSection} />
      <section id="admin-content" className="min-w-0 space-y-5" aria-busy={data.isLoading}>
        {data.summary ? <AdminSummaryStrip summary={data.summary} /> : null}
        {actionMessage ? <p role="status" className="rounded-hypo-md bg-hypo-success-soft px-4 py-3 text-sm text-hypo-success">{actionMessage}</p> : null}
        {error ? <div role="alert"><ErrorState title="처리하지 못했습니다.">{error}</ErrorState><button type="button" className="mt-2 text-sm font-bold text-hypo-brand" onClick={() => { setActionError(null); data.refresh(); }}>다시 시도</button></div> : null}
        {data.isLoading && (section === "notices" || section === "operations") ? <LoadingState title="운영 데이터를 불러오는 중입니다." /> : null}
        <Suspense fallback={<LoadingState title="운영 화면을 준비하고 있습니다." />}>
        {section === "notices" ? <NoticePanel accessToken={accessToken} notices={data.notices} onChanged={onAction} onError={setActionError} onDirtyChange={setDirty} onBusyChange={setBusy} />
          : section === "operations" ? <MaintenancePanel adminId={admin.id} accessToken={accessToken} maintenances={data.maintenances} onChanged={onAction} onError={setActionError} onDirtyChange={setDirty} onBusyChange={setBusy} />
          : section === "health" ? <HealthPanel health={data.summary?.health ?? null} healthJson={data.health.data ?? null} isLoading={data.health.isFetching} checkedAt={data.health.dataUpdatedAt} error={data.health.error ? getErrorMessage(data.health.error, "상태 확인 실패") : null} onRefresh={() => { void data.health.refetch(); }} />
          : section === "push" ? <PushPanel accessToken={accessToken} onAction={onAction} onError={setActionError} onDirtyChange={setDirty} onBusyChange={setBusy} />
          : section === "deletion" ? <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <AccountDeletionListPanel isLoading={data.isLoading} onRefresh={data.refresh} onSearchChange={(value) => { setSelectedDeletionId(null); setDeletionSearch(value); }} onSelect={setSelectedDeletionId} onStatusFilterChange={(value) => { setSelectedDeletionId(null); setDeletionStatusFilter(value); }} requests={data.deletionRequests} search={deletionSearch} selectedRequestId={selectedDeletion?.id ?? null} statusFilter={deletionStatusFilter} serverSearch hasMore={data.hasMoreDeletionRequests} onLoadMore={data.loadMoreDeletionRequests} />
            <AccountDeletionDetailPanel key={selectedDeletion?.id} accessToken={accessToken} request={selectedDeletion} onAction={onAction} onError={setActionError} />
          </div> : <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <SupportTicketListPanel deletedFilter={deletedFilter} isLoading={data.isLoading} onDeletedFilterChange={(value) => { if (canLeave()) { setDirty(false); setSelectedTicketId(null); setDeletedFilter(value); writeLocation(section, null); } }} onRefresh={() => { if (canLeave()) { setDirty(false); data.refresh(); } }} onSearchChange={(value) => { if (canLeave()) { setDirty(false); setSelectedTicketId(null); setTicketSearch(value); writeLocation(section, null); } }} onSelect={selectTicket} onStatusFilterChange={(value) => { if (canLeave()) { setDirty(false); setSelectedTicketId(null); setStatusFilter(value); writeLocation(section, null); } }} search={ticketSearch} section={section === "reports" ? "reports" : "tickets"} selectedTicketId={data.selectedTicket?.id ?? null} statusFilter={statusFilter} tickets={data.tickets} serverSearch hasMore={data.hasMoreTickets} onLoadMore={data.loadMoreTickets} />
            <SupportTicketDetailPanel key={data.selectedTicket?.id} accessToken={accessToken} targetPreview={data.targetPreview} targetError={data.targetError ? getErrorMessage(data.targetError, "대상 요약을 불러오지 못했습니다.") : null} ticket={data.selectedTicket} onAction={onAction} onError={setActionError} onDirtyChange={setDirty} onBusyChange={setBusy} />
          </div>}
        </Suspense>
      </section>
    </main>
  </div>;
}
