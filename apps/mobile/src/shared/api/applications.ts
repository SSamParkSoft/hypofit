import type { Application, ApplicationStatus } from "@hypofit/contracts";
import { apiRequest } from "./client";

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

export const applicationsApi = {
  list(accessToken?: string | null) {
    return apiRequest<Application[]>(applicationRoutes.collection, { accessToken });
  },
  create(input: CreateApplicationInput, accessToken?: string | null) {
    return apiRequest<Application>(applicationRoutes.collection, {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  updateStatus(
    applicationId: string,
    input: UpdateApplicationStatusInput,
    accessToken?: string | null,
  ) {
    return apiRequest<Application>(applicationRoutes.status(applicationId), {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    });
  },
} as const;
