import { apiRequest } from "./client";

export interface AccountDeletionRequest {
  id: string;
  user_id: string | null;
  email: string;
  email_hash: string | null;
  email_redacted_at: string | null;
  requester_name: string | null;
  reason: string | null;
  status: "requested" | "verified" | "in_review" | "completed" | "rejected" | "canceled";
  source: string;
  result: string | null;
  retention_note: string | null;
  retention_until: string | null;
  auth_user_delete_status: string | null;
  auth_user_deleted_at: string | null;
  auth_user_delete_error_code: string | null;
  verified_at: string | null;
  verification_expires_at?: string | null;
  verification_resend_available_at?: string | null;
  debug_verification_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePublicAccountDeletionInput {
  email: string;
  reason?: string | null;
  requester_name?: string | null;
}

export interface VerifyPublicAccountDeletionInput {
  request_id: string;
  code?: string | null;
  token?: string | null;
}

export interface ResendPublicAccountDeletionInput {
  request_id: string;
}

export interface ConfirmPublicAccountDeletionInput {
  request_id: string;
  deletion_authorization: string;
  confirm: true;
}

export interface AccountDeletionVerification {
  request: AccountDeletionRequest;
  deletion_authorization: string;
  deletion_authorization_expires_at: string;
}

export function createPublicAccountDeletionRequest(
  input: CreatePublicAccountDeletionInput,
): Promise<AccountDeletionRequest> {
  return apiRequest<AccountDeletionRequest>("/api/v1/account-deletion-requests/public", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function verifyPublicAccountDeletionRequest(
  input: VerifyPublicAccountDeletionInput,
): Promise<AccountDeletionVerification> {
  return apiRequest<AccountDeletionVerification>("/api/v1/account-deletion-requests/public/verify", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function resendPublicAccountDeletionRequest(
  input: ResendPublicAccountDeletionInput,
): Promise<AccountDeletionRequest> {
  return apiRequest<AccountDeletionRequest>("/api/v1/account-deletion-requests/public/resend", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function confirmPublicAccountDeletionRequest(
  input: ConfirmPublicAccountDeletionInput,
): Promise<AccountDeletionRequest> {
  return apiRequest<AccountDeletionRequest>("/api/v1/account-deletion-requests/public/confirm", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export const accountDeletionApi = {
  createPublic: createPublicAccountDeletionRequest,
  confirmPublic: confirmPublicAccountDeletionRequest,
  resendPublic: resendPublicAccountDeletionRequest,
  verifyPublic: verifyPublicAccountDeletionRequest,
} as const;
