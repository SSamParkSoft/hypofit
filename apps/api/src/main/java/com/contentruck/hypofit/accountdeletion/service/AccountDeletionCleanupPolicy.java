package com.contentruck.hypofit.accountdeletion.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

public final class AccountDeletionCleanupPolicy {

    public static final String PROFILE_IMAGE_BUCKET = "profileimage";
    static final String DELETED_USER_NAME = "탈퇴한 사용자";

    private static final String DELETED_EMAIL_DOMAIN = "deleted.hypofit.local";
    private static final Duration DELETION_REQUEST_RETENTION = Duration.ofDays(365);
    private static final Set<String> AUTH_USER_DELETE_SUCCESS_STATUSES = Set.of("deleted", "not_found");

    private AccountDeletionCleanupPolicy() {
    }

    public static String normalizeProfileImagePath(String profileImagePath) {
        if (profileImagePath == null) {
            return null;
        }

        String normalized = profileImagePath.strip().replaceFirst("^/+", "");
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.startsWith(PROFILE_IMAGE_BUCKET + "/")) {
            normalized = normalized.substring(PROFILE_IMAGE_BUCKET.length() + 1);
        }
        return normalized.isBlank() ? null : normalized;
    }

    static String buildRetentionNote(String profileImagePurgeStatus) {
        String base = "Interview workflow, support, report, and dispute records may be retained with direct profile identifiers removed where possible.";
        String suffix = switch (profileImagePurgeStatus) {
            case "deleted" -> "Stored profile image object was deleted from Supabase Storage.";
            case "already_missing" -> "Stored profile image object was already absent in Supabase Storage.";
            case "no_profile_image" -> "No stored profile image object was linked to the account.";
            case "skipped_missing_storage_config" ->
                    "Stored profile image reference was cleared, but storage purge requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
            case "delete_failed" ->
                    "Stored profile image reference was cleared, but storage purge needs operator follow-up.";
            case "pending_profile_image_purge" ->
                    "Stored profile image reference was cleared. Storage purge will run after account deactivation is committed.";
            default -> "";
        };
        return (base + " " + suffix).trim();
    }

    static String inferProfileImagePurgeStatus(String retentionNote) {
        if (retentionNote == null) {
            return null;
        }
        if (retentionNote.endsWith("Stored profile image object was deleted from Supabase Storage.")) {
            return "deleted";
        }
        if (retentionNote.endsWith("Stored profile image object was already absent in Supabase Storage.")) {
            return "already_missing";
        }
        if (retentionNote.endsWith("No stored profile image object was linked to the account.")) {
            return "no_profile_image";
        }
        if (retentionNote.endsWith("Stored profile image reference was cleared, but storage purge requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")) {
            return "skipped_missing_storage_config";
        }
        if (retentionNote.endsWith("Stored profile image reference was cleared, but storage purge needs operator follow-up.")) {
            return "delete_failed";
        }
        if (retentionNote.endsWith("Stored profile image reference was cleared. Storage purge will run after account deactivation is committed.")) {
            return "pending_profile_image_purge";
        }
        return null;
    }

    static OffsetDateTime retentionUntil(OffsetDateTime now) {
        return now.plus(DELETION_REQUEST_RETENTION);
    }

    static String redactedRequestEmail(UUID requestId) {
        return "deleted-request+" + requestId + "@" + DELETED_EMAIL_DOMAIN;
    }

    static String deletedUserEmail(UUID userId) {
        return "deleted+" + userId + "@" + DELETED_EMAIL_DOMAIN;
    }

    static boolean successAuthCleanup(String status) {
        return AUTH_USER_DELETE_SUCCESS_STATUSES.contains(status);
    }
}
