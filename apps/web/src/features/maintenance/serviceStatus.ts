import { apiRequest } from "../../shared/api/client";

export type MaintenanceMode = "FEATURE" | "FULL" | "NONE" | "READ_ONLY";
export type ServiceOperationStatus = "COMPLETED" | "IN_PROGRESS" | "NORMAL" | "SCHEDULED" | "VERIFYING";

export interface ServiceStatus {
  endsAt: string | null;
  message: string | null;
  mode: MaintenanceMode;
  startsAt: string | null;
  status: ServiceOperationStatus;
  title: string | null;
}

const maintenanceModes = new Set<MaintenanceMode>(["FEATURE", "FULL", "NONE", "READ_ONLY"]);
const serviceStatuses = new Set<ServiceOperationStatus>(["COMPLETED", "IN_PROGRESS", "NORMAL", "SCHEDULED", "VERIFYING"]);

export async function fetchServiceStatus(): Promise<ServiceStatus> {
  const payload = await apiRequest<unknown>("/api/v1/service-status");
  return parseServiceStatus(payload);
}

export function isFullMaintenance(status: ServiceStatus) {
  return status.mode === "FULL" && (status.status === "IN_PROGRESS" || status.status === "VERIFYING");
}

export function normalServiceStatus(): ServiceStatus {
  return {
    endsAt: null,
    message: null,
    mode: "NONE",
    startsAt: null,
    status: "NORMAL",
    title: null,
  };
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
    endsAt: readNullableString(value.ends_at),
    message: readNullableString(value.message),
    mode,
    startsAt: readNullableString(value.starts_at),
    status,
    title: readNullableString(value.title),
  };
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
