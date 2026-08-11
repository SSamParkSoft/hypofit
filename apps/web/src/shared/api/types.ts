export * from "@hypofit/contracts";

export interface AdminAccountDeletionRequest {
  id: string;
  user_id: string | null;
  requester_name: string | null;
  email_display: string;
  email_hash_prefix: string | null;
  email_redacted_at: string | null;
  reason: string | null;
  status: "requested" | "verified" | "in_review" | "completed" | "rejected" | "canceled";
  source: string;
  verification_status:
    | "not_required"
    | "awaiting_verification"
    | "verified"
    | "closed_without_verification";
  cleanup_status: string;
  result: string | null;
  profile_image_cleanup_status: string | null;
  auth_user_delete_status: string | null;
  auth_user_deleted_at: string | null;
  auth_user_delete_error_code: string | null;
  auth_cleanup_retry_available: boolean;
  retention_note: string | null;
  retention_until: string | null;
  verified_at: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAccountDeletionListParams {
  status?: AdminAccountDeletionRequest["status"];
  limit?: number;
}
