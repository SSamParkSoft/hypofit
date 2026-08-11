import type { AdminAccountDeletionRequest } from "../../shared/api/types";

type BadgeIntent = "brand" | "warning" | "success" | "neutral" | "danger" | "info";

export function matchesAccountDeletionSearch(
  request: AdminAccountDeletionRequest,
  rawSearch: string,
) {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;

  return [
    request.id,
    request.user_id,
    request.email_display,
    request.email_hash_prefix,
    request.reason,
    request.result,
    request.retention_note,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .some((value) => value.toLowerCase().includes(search));
}

export function getAccountDeletionStatusLabel(status: AdminAccountDeletionRequest["status"]) {
  switch (status) {
    case "requested":
      return "접수됨";
    case "verified":
      return "인증됨";
    case "in_review":
      return "검토 중";
    case "completed":
      return "완료";
    case "rejected":
      return "거절됨";
    case "canceled":
      return "취소됨";
    default:
      return status;
  }
}

export function getAccountDeletionStatusIntent(
  status: AdminAccountDeletionRequest["status"],
): BadgeIntent {
  switch (status) {
    case "requested":
    case "verified":
      return "brand";
    case "in_review":
      return "warning";
    case "completed":
      return "success";
    case "rejected":
    case "canceled":
      return "neutral";
    default:
      return "neutral";
  }
}

export function getVerificationStatusLabel(
  verificationStatus: AdminAccountDeletionRequest["verification_status"],
) {
  switch (verificationStatus) {
    case "not_required":
      return "인증 불필요";
    case "awaiting_verification":
      return "이메일 확인 대기";
    case "verified":
      return "이메일 확인 완료";
    case "closed_without_verification":
      return "인증 없이 종료";
    default:
      return verificationStatus;
  }
}

export function getCleanupStatusLabel(cleanupStatus: AdminAccountDeletionRequest["cleanup_status"]) {
  switch (cleanupStatus) {
    case "pending":
      return "정리 대기";
    case "account_deleted":
      return "계정 정리 완료";
    case "no_matching_active_account":
      return "활성 계정 없음";
    case "rejected":
      return "거절됨";
    case "canceled":
      return "취소됨";
    case "completed":
      return "완료";
    default:
      return cleanupStatus;
  }
}

export function getProfileImageCleanupLabel(
  profileImageStatus: AdminAccountDeletionRequest["profile_image_cleanup_status"],
) {
  switch (profileImageStatus) {
    case "deleted":
      return "이미지 삭제 완료";
    case "already_missing":
      return "이미지 이미 없음";
    case "no_profile_image":
      return "프로필 이미지 없음";
    case "skipped_missing_storage_config":
      return "스토리지 설정 누락";
    case "delete_failed":
      return "이미지 삭제 실패";
    case "pending_profile_image_purge":
      return "이미지 삭제 대기";
    case null:
      return "정보 없음";
    default:
      return profileImageStatus;
  }
}

export function getAuthCleanupLabel(
  authStatus: AdminAccountDeletionRequest["auth_user_delete_status"],
) {
  switch (authStatus) {
    case "deleted":
      return "Auth 삭제 완료";
    case "not_found":
      return "Auth 계정 없음";
    case "pending":
      return "Auth 삭제 대기";
    case "failed_retryable":
      return "Auth 재시도 필요";
    case "skipped_missing_config":
      return "Auth 설정 누락";
    case "failed_non_retryable":
      return "Auth 영구 실패";
    case null:
      return "정보 없음";
    default:
      return authStatus;
  }
}

export function getAuthCleanupIntent(
  request: Pick<
    AdminAccountDeletionRequest,
    "auth_cleanup_retry_available" | "auth_user_delete_status"
  >,
): BadgeIntent {
  if (request.auth_cleanup_retry_available) return "warning";
  if (request.auth_user_delete_status === "deleted" || request.auth_user_delete_status === "not_found") {
    return "success";
  }
  if (request.auth_user_delete_status === "failed_non_retryable") {
    return "danger";
  }
  return "neutral";
}
