import { apiRequest } from "./client";

export type AccountDeletionRequestStatus =
  | "requested"
  | "verified"
  | "in_review"
  | "completed"
  | "rejected"
  | "canceled";

export interface AccountDeletionRequest {
  id: string;
  user_id: string | null;
  email: string;
  email_hash: string | null;
  email_redacted_at: string | null;
  requester_name: string | null;
  reason: string | null;
  status: AccountDeletionRequestStatus;
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

export interface AccountDeletionRequestInput {
  reason?: string | null;
}

export interface AccountDeletionVerificationInput {
  request_id: string;
  code: string;
}

export interface AccountDeletionResendInput {
  request_id: string;
}

export interface AccountDeletionConfirmInput {
  request_id: string;
  deletion_authorization: string;
  confirm: true;
}

export interface AccountDeletionVerification {
  request: AccountDeletionRequest;
  deletion_authorization: string;
  deletion_authorization_expires_at: string;
}

const myAccountDeletionPath = "/api/v1/account-deletion-requests/me";

export function createMyAccountDeletionRequest(
  input: AccountDeletionRequestInput,
  accessToken: string,
): Promise<AccountDeletionRequest> {
  return apiRequest<AccountDeletionRequest>(myAccountDeletionPath, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function verifyMyAccountDeletionRequest(
  input: AccountDeletionVerificationInput,
  accessToken: string,
): Promise<AccountDeletionVerification> {
  return apiRequest<AccountDeletionVerification>(`${myAccountDeletionPath}/verify`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function resendMyAccountDeletionCode(
  input: AccountDeletionResendInput,
  accessToken: string,
): Promise<AccountDeletionRequest> {
  return apiRequest<AccountDeletionRequest>(`${myAccountDeletionPath}/resend`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function confirmMyAccountDeletion(
  input: AccountDeletionConfirmInput,
  accessToken: string,
): Promise<AccountDeletionRequest> {
  return apiRequest<AccountDeletionRequest>(`${myAccountDeletionPath}/confirm`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export const accountDeletionApi = {
  createMyRequest: createMyAccountDeletionRequest,
  verifyMyRequest: verifyMyAccountDeletionRequest,
  resendMyCode: resendMyAccountDeletionCode,
  confirmMyRequest: confirmMyAccountDeletion,
} as const;
