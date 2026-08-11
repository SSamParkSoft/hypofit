export type AccountDeletionStatus =
  | "requested"
  | "verified"
  | "in_review"
  | "completed"
  | "rejected"
  | "canceled";

export interface PublicAccountDeletionRequestCreate {
  email: string;
  requester_name?: string | null;
  reason?: string | null;
}

export interface PublicAccountDeletionRequestVerify {
  request_id: string;
  code?: string | null;
  token?: string | null;
}

export interface AccountDeletionRequestResend {
  request_id: string;
}

export interface AccountDeletionRequestConfirm {
  request_id: string;
  deletion_authorization: string;
  confirm: true;
}

export interface AccountDeletionRequestCreate {
  reason?: string | null;
}

export interface AccountDeletionRequest {
  id: string;
  user_id: string | null;
  email: string;
  email_hash?: string | null;
  email_redacted_at?: string | null;
  requester_name: string | null;
  reason: string | null;
  status: AccountDeletionStatus;
  source: string;
  result: string | null;
  retention_note: string | null;
  verified_at: string | null;
  verification_expires_at?: string | null;
  verification_resend_available_at?: string | null;
  debug_verification_code?: string | null;
  retention_until?: string | null;
  auth_user_delete_status?: string | null;
  auth_user_deleted_at?: string | null;
  auth_user_delete_error_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountDeletionVerification {
  request: AccountDeletionRequest;
  deletion_authorization: string;
  deletion_authorization_expires_at: string;
}
