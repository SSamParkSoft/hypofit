import { apiRequest, type ApiRequestInit } from "./client";
import type { Session } from "./types";

export interface CreateSessionInput {
  application_id: string;
  scheduled_at: string;
  meeting_type: "offline" | "online";
  meeting_url?: string | null;
  place?: string | null;
}

export interface MarkNoShowInput {
  no_show_party?: "founder" | "respondent" | null;
}

const sessionsCollectionPath = "/api/v1/sessions/";

export const sessionRoutes = {
  collection: sessionsCollectionPath,
  complete: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/complete`,
  noShow: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/no-show`,
} as const;

export function listSessions(
  accessToken?: string | null,
  init?: ApiRequestInit,
): Promise<Session[]> {
  return apiRequest<Session[]>(sessionRoutes.collection, { ...init, accessToken });
}

export function createSession(
  input: CreateSessionInput,
  accessToken?: string | null,
): Promise<Session> {
  return apiRequest<Session>(sessionRoutes.collection, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function completeSession(sessionId: string, accessToken?: string | null): Promise<Session> {
  return apiRequest<Session>(sessionRoutes.complete(sessionId), {
    method: "POST",
    accessToken,
  });
}

export function markNoShow(
  sessionId: string,
  input: MarkNoShowInput,
  accessToken?: string | null,
): Promise<Session> {
  return apiRequest<Session>(sessionRoutes.noShow(sessionId), {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export const sessionsApi = {
  list: listSessions,
  create: createSession,
  complete: completeSession,
  markNoShow,
} as const;
