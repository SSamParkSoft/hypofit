package com.contentruck.hypofit.accountdeletion.service;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminAccountDeletionRequestView(
        UUID id,
        UUID userId,
        String requesterName,
        String emailDisplay,
        String emailHashPrefix,
        OffsetDateTime emailRedactedAt,
        String reason,
        String status,
        String source,
        String verificationStatus,
        String cleanupStatus,
        String result,
        String profileImageCleanupStatus,
        String authUserDeleteStatus,
        OffsetDateTime authUserDeletedAt,
        String authUserDeleteErrorCode,
        boolean authCleanupRetryAvailable,
        String retentionNote,
        OffsetDateTime retentionUntil,
        OffsetDateTime verifiedAt,
        UUID processedBy,
        OffsetDateTime processedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
