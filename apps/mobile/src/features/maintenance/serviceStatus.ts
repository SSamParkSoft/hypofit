import { apiGet } from "@/shared/api/client";

export type MaintenanceMode = "FEATURE" | "FULL" | "NONE" | "READ_ONLY";
export type ServiceOperationStatus = "COMPLETED" | "IN_PROGRESS" | "NORMAL" | "SCHEDULED" | "VERIFYING";

export interface ServiceStatus {
  affectedFeatures: string[];
  endsAt: string | null;
  message: string | null;
  mode: MaintenanceMode;
  noticeId: string | null;
  startsAt: string | null;
  status: ServiceOperationStatus;
  title: string | null;
  scheduledMaintenance: ScheduledMaintenance | null;
}

export interface ScheduledMaintenance {
  endsAt: string | null;
  id: string;
  noticeId: string | null;
  startsAt: string;
  title: string;
}

const maintenanceModes = new Set<MaintenanceMode>(["FEATURE", "FULL", "NONE", "READ_ONLY"]);
const serviceStatuses = new Set<ServiceOperationStatus>(["COMPLETED", "IN_PROGRESS", "NORMAL", "SCHEDULED", "VERIFYING"]);

export async function fetchServiceStatus(): Promise<ServiceStatus> {
  const payload = await apiGet<unknown>("/api/v1/service-status");
  return parseServiceStatus(payload);
}

export function isFullMaintenance(status: ServiceStatus) {
  return status.mode === "FULL" && (status.status === "IN_PROGRESS" || status.status === "VERIFYING");
}

export function parseServiceStatus(payload: unknown): ServiceStatus {
  if (!payload || typeof payload !== "object") {
    return normalServiceStatus();
  }

  const value = payload as Record<string, unknown>;
  const status = typeof value.status === "string" && serviceStatuses.has(value.status as ServiceOperationStatus)
    ? value.status as ServiceOperationStatus
    : "NORMAL";
  const mode = typeof value.mode === "string" && maintenanceModes.has(value.mode as MaintenanceMode)
    ? value.mode as MaintenanceMode
    : "NONE";

  return {
    affectedFeatures: Array.isArray(value.affected_features)
      ? value.affected_features.filter((feature): feature is string => typeof feature === "string")
      : [],
    endsAt: readNullableString(value.ends_at),
    message: readNullableString(value.message),
    mode,
    noticeId: readNullableString(value.notice_id),
    startsAt: readNullableString(value.starts_at),
    status,
    title: readNullableString(value.title),
    scheduledMaintenance: parseScheduledMaintenance(value.scheduled_maintenance),
  };
}

export function normalServiceStatus(): ServiceStatus {
  return {
    affectedFeatures: [],
    endsAt: null,
    message: null,
    mode: "NONE",
    noticeId: null,
    startsAt: null,
    status: "NORMAL",
    title: null,
    scheduledMaintenance: null,
  };
}

function parseScheduledMaintenance(value: unknown): ScheduledMaintenance | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = readNullableString(item.id);
  const title = readNullableString(item.title);
  const startsAt = readNullableString(item.starts_at);
  if (!id || !title || !startsAt) return null;
  return { id, title, startsAt, endsAt: readNullableString(item.ends_at), noticeId: readNullableString(item.notice_id) };
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
