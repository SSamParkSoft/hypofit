import { apiRequest, type ApiRequestInit } from "./client";
import type { Application, ApplicationStatus } from "./types";

export interface CreateApplicationInput {
  interview_post_id: string;
  answers?: Record<string, string>;
  available_times?: string[];
}

export interface UpdateApplicationStatusInput {
  status: Exclude<ApplicationStatus, "applied">;
  rejection_reason?: string | null;
}

const applicationsCollectionPath = "/api/v1/applications/";

export const applicationRoutes = {
  collection: applicationsCollectionPath,
  status: (applicationId: string) =>
    `${applicationsCollectionPath}${encodeURIComponent(applicationId)}/status`,
} as const;

export function listApplications(
  accessToken?: string | null,
  init?: ApiRequestInit,
): Promise<Application[]> {
  return apiRequest<Application[]>(applicationRoutes.collection, { ...init, accessToken });
}

export function createApplication(
  input: CreateApplicationInput,
  accessToken?: string | null,
): Promise<Application> {
  return apiRequest<Application>(applicationRoutes.collection, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function updateApplicationStatus(
  applicationId: string,
  input: UpdateApplicationStatusInput,
  accessToken?: string | null,
): Promise<Application> {
  return apiRequest<Application>(applicationRoutes.status(applicationId), {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export const applicationsApi = {
  list: listApplications,
  create: createApplication,
  updateStatus: updateApplicationStatus,
} as const;
