import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AccountDeletionDetailPanel,
  AccountDeletionListPanel,
  AdminAccessState,
  AdminSectionNavigation,
  AdminSummaryStrip,
  HealthPanel,
  MaintenancePanel,
  NoticePanel,
  PushPanel,
  SupportTicketDetailPanel,
  SupportTicketListPanel,
} from "../features/admin/components";
import { getErrorMessage, type AdminSection } from "../features/admin/adminViewModel";
import { adminApi } from "../shared/api/admin";
import { apiRequest } from "../shared/api/client";
import type {
  AdminAccountDeletionRequest,
  AdminMe,
  AdminSupportTicket,
  AdminSummary,
  AdminMaintenance,
  AdminNotice,
  AdminTargetPreview,
  SupportTicketKind,
  SupportTicketStatus,
} from "../shared/api/types";
import { ErrorState } from "../shared/ui/state";

interface AdminPageProps {
  accessToken: string | null;
}

export function AdminPage({ accessToken }: AdminPageProps) {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [maintenances, setMaintenances] = useState<AdminMaintenance[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<AdminAccountDeletionRequest[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedDeletionRequestId, setSelectedDeletionRequestId] = useState<string | null>(null);
  const [targetPreview, setTargetPreview] = useState<AdminTargetPreview | null>(null);
  const [section, setSection] = useState<AdminSection>("tickets");
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "all">("open");
  const [deletionStatusFilter, setDeletionStatusFilter] = useState<
    AdminAccountDeletionRequest["status"] | "all"
  >("all");
  const [deletedFilter, setDeletedFilter] = useState<"all" | "active" | "deleted">("active");
  const [ticketSearch, setTicketSearch] = useState("");
  const [deletionSearch, setDeletionSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [healthJson, setHealthJson] = useState<Record<string, unknown> | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0] ?? null,
    [selectedTicketId, tickets],
  );
  const selectedDeletionRequest = useMemo(
    () =>
      deletionRequests.find((request) => request.id === selectedDeletionRequestId) ??
      deletionRequests[0] ??
      null,
    [deletionRequests, selectedDeletionRequestId],
  );

  const activeKind: SupportTicketKind | undefined = section === "reports" ? "report" : undefined;

  const refresh = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [adminMe, nextSummary] = await Promise.all([
        adminApi.getMe(accessToken),
        adminApi.getSummary(accessToken),
      ]);
      setAdmin(adminMe);
      setSummary(nextSummary);

      if (section === "notices") {
        setNotices(await adminApi.listNotices(accessToken));
        return;
      }

      if (section === "operations") {
        setMaintenances(await adminApi.listMaintenances(accessToken));
        return;
      }

      if (section === "deletion") {
        const nextRequests = await adminApi.listAccountDeletionRequests(
          {
            status: deletionStatusFilter === "all" ? undefined : deletionStatusFilter,
            limit: 100,
          },
          accessToken,
        );
        setDeletionRequests(nextRequests);
        setSelectedDeletionRequestId((currentId) =>
          currentId && !nextRequests.some((request) => request.id === currentId)
            ? nextRequests[0]?.id ?? null
            : currentId,
        );
        return;
      }

      const nextTickets = await adminApi.listTickets(
        {
          kind: activeKind,
          status: statusFilter === "all" ? undefined : statusFilter,
          deleted_by_user: deletedFilter === "all" ? undefined : deletedFilter === "deleted",
          limit: 100,
        },
        accessToken,
      );
      setTickets(nextTickets);
      setSelectedTicketId((currentId) =>
        currentId && !nextTickets.some((ticket) => ticket.id === currentId)
          ? nextTickets[0]?.id ?? null
          : currentId,
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "관리자 데이터를 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, activeKind, deletedFilter, deletionStatusFilter, section, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (
      section === "deletion" ||
      !accessToken ||
      !selectedTicket?.target_type ||
      !selectedTicket.target_id
    ) {
      setTargetPreview(null);
      return;
    }

    let isMounted = true;
    adminApi
      .getTargetPreview(selectedTicket.target_type, selectedTicket.target_id, accessToken)
      .then((preview) => {
        if (isMounted) setTargetPreview(preview);
      })
      .catch(() => {
        if (isMounted) setTargetPreview(null);
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, section, selectedTicket?.target_id, selectedTicket?.target_type]);

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setErrorMessage(null);
    try {
      const nextHealth = await apiRequest<Record<string, unknown>>("/api/v1/health/ready", {
        signal,
      });
      setHealthJson(nextHealth);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "상태 점검을 불러오지 못했습니다."));
    }
  }, []);

  useEffect(() => {
    if (section !== "health") {
      return;
    }

    const controller = new AbortController();
    void loadHealth(controller.signal);
    return () => controller.abort();
  }, [loadHealth, section]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleHealthRefresh = useCallback(() => {
    void loadHealth();
  }, [loadHealth]);

  const handleAction = useCallback(
    (message: string) => {
      setActionMessage(message);
      void refresh();
    },
    [refresh],
  );

  if (!accessToken) {
    return <AdminAccessState title="로그인이 필요합니다." description="관리자 콘솔은 로그인 후 이용할 수 있습니다." />;
  }

  if (errorMessage && !admin && !isLoading) {
    return <AdminAccessState title="관리자 권한이 필요합니다." description={errorMessage} />;
  }

  return (
    <div className="min-h-dvh bg-[#F6F7F8] text-hypo-text">
      <header className="border-b border-hypo-border bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-hypo-brand">Hypofit Admin</p>
            <h1 className="mt-1 text-2xl font-black">운영 콘솔</h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-black">{admin?.name ?? "관리자 확인 중"}</p>
            <p className="text-hypo-text-muted">{admin?.email ?? ""}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1440px] grid-cols-[220px_minmax(0,1fr)] gap-6 px-6 py-6">
        <AdminSectionNavigation section={section} onSectionChange={setSection} />

        <section className="space-y-5">
          {summary ? <AdminSummaryStrip summary={summary} /> : null}
          {actionMessage ? (
            <div className="rounded-hypo-lg border border-green-100 bg-hypo-success-soft px-4 py-3 text-sm font-bold text-hypo-success">
              {actionMessage}
            </div>
          ) : null}
          {errorMessage && admin ? (
            <ErrorState title="처리하지 못했습니다.">{errorMessage}</ErrorState>
          ) : null}

          {section === "notices" ? (
            <NoticePanel accessToken={accessToken} notices={notices} onChanged={handleAction} onError={setErrorMessage} />
          ) : section === "operations" ? (
            <MaintenancePanel accessToken={accessToken} maintenances={maintenances} onChanged={handleAction} onError={setErrorMessage} />
          ) : section === "health" ? (
            <HealthPanel health={summary?.health ?? null} healthJson={healthJson} onRefresh={handleHealthRefresh} />
          ) : section === "push" ? (
            <PushPanel accessToken={accessToken} onAction={handleAction} onError={setErrorMessage} />
          ) : section === "deletion" ? (
            <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)] gap-5">
              <AccountDeletionListPanel
                isLoading={isLoading}
                onRefresh={handleRefresh}
                onSearchChange={setDeletionSearch}
                onSelect={setSelectedDeletionRequestId}
                onStatusFilterChange={setDeletionStatusFilter}
                requests={deletionRequests}
                search={deletionSearch}
                selectedRequestId={selectedDeletionRequest?.id ?? null}
                statusFilter={deletionStatusFilter}
              />
              <AccountDeletionDetailPanel
                accessToken={accessToken}
                request={selectedDeletionRequest}
                onAction={handleAction}
                onError={setErrorMessage}
              />
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)] gap-5">
              <SupportTicketListPanel
                deletedFilter={deletedFilter}
                isLoading={isLoading}
                onDeletedFilterChange={setDeletedFilter}
                onRefresh={handleRefresh}
                onSearchChange={setTicketSearch}
                onSelect={setSelectedTicketId}
                onStatusFilterChange={setStatusFilter}
                search={ticketSearch}
                section={section === "reports" ? "reports" : "tickets"}
                selectedTicketId={selectedTicket?.id ?? null}
                statusFilter={statusFilter}
                tickets={tickets}
              />
              <SupportTicketDetailPanel
                accessToken={accessToken}
                targetPreview={targetPreview}
                ticket={selectedTicket}
                onAction={handleAction}
                onError={setErrorMessage}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
