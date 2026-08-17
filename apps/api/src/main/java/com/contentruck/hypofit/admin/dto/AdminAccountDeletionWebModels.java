package com.contentruck.hypofit.admin.dto;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionService.AdminAccountDeletionRequestView;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class AdminAccountDeletionWebModels {

    private AdminAccountDeletionWebModels() {
    }

    public record AdminAccountDeletionRequestResponse(
            UUID id,
            @JsonProperty("user_id") UUID userId,
            @JsonProperty("requester_name") String requesterName,
            @JsonProperty("email_display") String emailDisplay,
            @JsonProperty("email_hash_prefix") String emailHashPrefix,
            @JsonProperty("email_redacted_at") OffsetDateTime emailRedactedAt,
            String reason,
            @Schema(allowableValues = {"requested", "verified", "in_review", "completed", "rejected", "canceled"})
            String status,
            String source,
            @Schema(allowableValues = {"not_required", "awaiting_verification", "verified", "closed_without_verification"})
            @JsonProperty("verification_status") String verificationStatus,
            @JsonProperty("cleanup_status") String cleanupStatus,
            String result,
            @JsonProperty("profile_image_cleanup_status") String profileImageCleanupStatus,
            @JsonProperty("auth_user_delete_status") String authUserDeleteStatus,
            @JsonProperty("auth_user_deleted_at") OffsetDateTime authUserDeletedAt,
            @JsonProperty("auth_user_delete_error_code") String authUserDeleteErrorCode,
            @Schema(defaultValue = "false")
            @JsonProperty("auth_cleanup_retry_available") boolean authCleanupRetryAvailable,
            @JsonProperty("retention_note") String retentionNote,
            @JsonProperty("retention_until") OffsetDateTime retentionUntil,
            @JsonProperty("verified_at") OffsetDateTime verifiedAt,
            @JsonProperty("processed_by") UUID processedBy,
            @JsonProperty("processed_at") OffsetDateTime processedAt,
            @JsonProperty("created_at") OffsetDateTime createdAt,
            @JsonProperty("updated_at") OffsetDateTime updatedAt
    ) {
        public static AdminAccountDeletionRequestResponse from(AdminAccountDeletionRequestView view) {
            return new AdminAccountDeletionRequestResponse(
                    view.id(),
                    view.userId(),
                    view.requesterName(),
                    view.emailDisplay(),
                    view.emailHashPrefix(),
                    view.emailRedactedAt(),
                    view.reason(),
                    view.status(),
                    view.source(),
                    view.verificationStatus(),
                    view.cleanupStatus(),
                    view.result(),
                    view.profileImageCleanupStatus(),
                    view.authUserDeleteStatus(),
                    view.authUserDeletedAt(),
                    view.authUserDeleteErrorCode(),
                    view.authCleanupRetryAvailable(),
                    view.retentionNote(),
                    view.retentionUntil(),
                    view.verifiedAt(),
                    view.processedBy(),
                    view.processedAt(),
                    view.createdAt(),
                    view.updatedAt()
            );
        }
    }
}
