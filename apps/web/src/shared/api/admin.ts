import { apiRequest } from "./client";
import type {
  AdminAccountDeletionListParams,
  AdminAccountDeletionRequest,
  AdminMe,
  AdminModerationAction,
  AdminModerationActionCreateInput,
  AdminSummary,
  AdminSupportTicket,
  AdminTargetPreview,
  AdminTargetType,
  AdminTestNotificationInput,
  AdminTestNotificationResult,
  AdminTicketListParams,
  AdminTicketReplyInput,
  AdminTicketStatusUpdateInput,
  PushDispatchResult,
  AdminNotice,
  AdminNoticeInput,
  AdminMaintenance,
  AdminEmergencyMaintenanceInput,
  AdminMaintenanceInput,
  AdminMaintenanceEvent,
} from "./types";

function buildTicketQuery(params?: AdminTicketListParams) {
  const search = new URLSearchParams();

  if (params?.kind) search.set("kind", params.kind);
  if (params?.status) search.set("status", params.status);
  if (typeof params?.deleted_by_user === "boolean") {
    search.set("deleted_by_user", String(params.deleted_by_user));
  }
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  if (params?.q) search.set("q", params.q);
  if (params?.exclude_reports) search.set("exclude_reports", "true");
  if (typeof params?.include_events === "boolean") search.set("include_events", String(params.include_events));

  const value = search.toString();
  return value ? `?${value}` : "";
}

function buildAccountDeletionQuery(params?: AdminAccountDeletionListParams) {
  const search = new URLSearchParams();

  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.page !== undefined) search.set("page", String(params.page));
  if (params?.q) search.set("q", params.q);

  const value = search.toString();
  return value ? `?${value}` : "";
}

export const adminApi = {
  getMe(accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<AdminMe>("/api/v1/admin/me", { accessToken, signal });
  },

  getSummary(accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<AdminSummary>("/api/v1/admin/summary", { accessToken, signal });
  },

  listTickets(params?: AdminTicketListParams, accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<AdminSupportTicket[]>(
      `/api/v1/admin/support/tickets${buildTicketQuery(params)}`,
      { accessToken, signal },
    );
  },

  listAccountDeletionRequests(
    params?: AdminAccountDeletionListParams,
    accessToken?: string | null,
    signal?: AbortSignal,
  ) {
    return apiRequest<AdminAccountDeletionRequest[]>(
      `/api/v1/admin/account-deletion-requests${buildAccountDeletionQuery(params)}`,
      { accessToken, signal },
    );
  },

  getTicket(ticketId: string, accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<AdminSupportTicket>(
      `/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}`,
      { accessToken, signal },
    );
  },

  updateTicketStatus(
    ticketId: string,
    input: AdminTicketStatusUpdateInput,
    accessToken?: string | null,
  ) {
    return apiRequest<AdminSupportTicket>(
      `/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}/status`,
      {
        accessToken,
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  replyToTicket(ticketId: string, input: AdminTicketReplyInput, accessToken?: string | null) {
    return apiRequest<AdminSupportTicket["events"][number]>(
      `/api/v1/admin/support/tickets/${encodeURIComponent(ticketId)}/replies`,
      {
        accessToken,
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },

  createModerationAction(input: AdminModerationActionCreateInput, accessToken?: string | null) {
    return apiRequest<AdminModerationAction>("/api/v1/admin/moderation/actions", {
      accessToken,
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getTargetPreview(targetType: AdminTargetType, targetId: string, accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<AdminTargetPreview>(
      `/api/v1/admin/targets/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`,
      { accessToken, signal },
    );
  },

  retryAccountDeletionAuthCleanup(requestId: string, accessToken?: string | null) {
    return apiRequest<AdminAccountDeletionRequest>(
      `/api/v1/admin/account-deletion-requests/${encodeURIComponent(requestId)}/retry-auth-cleanup`,
      {
        accessToken,
        method: "POST",
      },
    );
  },

  retryAccountDeletionProfileImageCleanup(requestId: string, accessToken?: string | null) {
    return apiRequest<AdminAccountDeletionRequest>(
      `/api/v1/admin/account-deletion-requests/${encodeURIComponent(requestId)}/retry-profile-image-cleanup`,
      { accessToken, method: "POST" },
    );
  },

  dispatchPendingPushDeliveries(accessToken?: string | null) {
    return apiRequest<PushDispatchResult>("/api/v1/admin/push-deliveries/dispatch", {
      accessToken,
      method: "POST",
    });
  },

  sendTestNotification(input: AdminTestNotificationInput, accessToken?: string | null) {
    return apiRequest<AdminTestNotificationResult>("/api/v1/admin/notifications/test", {
      accessToken,
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  listNotices(accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<AdminNotice[]>("/api/v1/admin/notices", { accessToken, signal });
  },

  createNotice(input: AdminNoticeInput, accessToken?: string | null) {
    return apiRequest<AdminNotice>("/api/v1/admin/notices", { accessToken, method: "POST", body: JSON.stringify(input) });
  },

  updateNotice(id: string, input: AdminNoticeInput, accessToken?: string | null) {
    return apiRequest<AdminNotice>(`/api/v1/admin/notices/${encodeURIComponent(id)}`, {
      accessToken, method: "PATCH", body: JSON.stringify(input),
    });
  },

  publishNotice(id: string, accessToken?: string | null) {
    return apiRequest<AdminNotice>(`/api/v1/admin/notices/${encodeURIComponent(id)}/publish`, { accessToken, method: "POST" });
  },

  archiveNotice(id: string, accessToken?: string | null) {
    return apiRequest<AdminNotice>(`/api/v1/admin/notices/${encodeURIComponent(id)}/archive`, { accessToken, method: "POST" });
  },

  deleteNotice(id: string, accessToken?: string | null) {
    return apiRequest<void>(`/api/v1/admin/notices/${encodeURIComponent(id)}`, { accessToken, method: "DELETE" });
  },

  listMaintenances(accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<AdminMaintenance[]>("/api/v1/admin/maintenances", { accessToken, signal });
  },

  createMaintenance(input: AdminMaintenanceInput, accessToken?: string | null) {
    return apiRequest<AdminMaintenance>("/api/v1/admin/maintenances", { accessToken, method: "POST", body: JSON.stringify(input) });
  },

  updateMaintenance(id: string, input: AdminMaintenanceInput, accessToken?: string | null) {
    return apiRequest<AdminMaintenance>(`/api/v1/admin/maintenances/${encodeURIComponent(id)}`, {
      accessToken, method: "PATCH", body: JSON.stringify(input),
    });
  },

  listMaintenanceEvents(id: string, accessToken?: string | null, signal?: AbortSignal) {
    return apiRequest<AdminMaintenanceEvent[]>(`/api/v1/admin/maintenances/${encodeURIComponent(id)}/events`, { accessToken, signal });
  },

  emergencyStartMaintenance(input: AdminEmergencyMaintenanceInput, accessToken?: string | null) {
    return apiRequest<AdminMaintenance>("/api/v1/admin/maintenances/emergency-start", {
      accessToken,
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  transitionMaintenance(id: string, action: "start" | "verify" | "complete" | "cancel", accessToken?: string | null) {
    return apiRequest<AdminMaintenance>(`/api/v1/admin/maintenances/${encodeURIComponent(id)}/${action}`, { accessToken, method: "POST" });
  },
} as const;
