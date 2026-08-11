package com.contentruck.hypofit.accountdeletion.application;

import com.contentruck.hypofit.accountdeletion.domain.AccountDeletionRequestReadModel;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface AccountDeletionRepository {

    Optional<AccountDeletionRequestRecord> findRequest(UUID requestId);

    Optional<AccountDeletionRequestRecord> findRequestForUpdate(UUID requestId);

    boolean claimVerifiedRequest(UUID requestId, OffsetDateTime updatedAt);

    Optional<AccountDeletionRequestRecord> findLatestRequestForUser(UUID userId);

    Optional<AccountDeletionRequestRecord> findLatestPublicRequestByEmailHash(String emailHash);

    List<AccountDeletionRequestRecord> listRequestsForAdmin(String status, int limit);

    Optional<UserAccountRecord> findUserAccount(UUID userId);

    Optional<UserAccountRecord> findUserByEmail(String email);

    AccountDeletionRequestReadModel saveRequest(AccountDeletionRequestMutation mutation);

    UserAccountRecord saveUserDeletion(UserDeletionMutation mutation);

    int disablePushDevices(UUID userId, OffsetDateTime disabledAt, String disabledReason, OffsetDateTime updatedAt);

    void recordAuditEvent(
            UUID actorUserId,
            String actorType,
            String eventType,
            String targetType,
            UUID targetId,
            String reason,
            Map<String, Object> metadata
    );

    record UserAccountRecord(
            UUID id,
            String email,
            String name,
            String bio,
            String phone,
            String role,
            String profileImagePath,
            String profileImageUrl,
            OffsetDateTime deactivatedAt,
            OffsetDateTime deletedAt,
            OffsetDateTime anonymizedAt,
            OffsetDateTime deletionRequestedAt,
            OffsetDateTime deletionCompletedAt,
            String deletionReason,
            String deletedEmailHash
    ) {
    }

    record AccountDeletionRequestRecord(
            UUID id,
            UUID userId,
            String email,
            String emailHash,
            OffsetDateTime emailRedactedAt,
            String requesterName,
            String reason,
            String status,
            String source,
            String verificationTokenHash,
            String verificationCodeHash,
            OffsetDateTime verificationExpiresAt,
            int verificationAttemptCount,
            OffsetDateTime verificationResendAvailableAt,
            OffsetDateTime verificationLockedAt,
            int verificationSendCount,
            OffsetDateTime verificationWindowStartedAt,
            String deletionAuthorizationHash,
            OffsetDateTime deletionAuthorizationExpiresAt,
            OffsetDateTime verifiedAt,
            UUID processedBy,
            OffsetDateTime processedAt,
            String result,
            String retentionNote,
            OffsetDateTime retentionUntil,
            String authUserDeleteStatus,
            OffsetDateTime authUserDeletedAt,
            String authUserDeleteErrorCode,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    record AccountDeletionRequestMutation(
            UUID id,
            UUID userId,
            String email,
            String emailHash,
            OffsetDateTime emailRedactedAt,
            String requesterName,
            String reason,
            String status,
            String source,
            String verificationTokenHash,
            String verificationCodeHash,
            OffsetDateTime verificationExpiresAt,
            int verificationAttemptCount,
            OffsetDateTime verificationResendAvailableAt,
            OffsetDateTime verificationLockedAt,
            int verificationSendCount,
            OffsetDateTime verificationWindowStartedAt,
            String deletionAuthorizationHash,
            OffsetDateTime deletionAuthorizationExpiresAt,
            OffsetDateTime verifiedAt,
            UUID processedBy,
            OffsetDateTime processedAt,
            String result,
            String retentionNote,
            OffsetDateTime retentionUntil,
            String authUserDeleteStatus,
            OffsetDateTime authUserDeletedAt,
            String authUserDeleteErrorCode,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    record UserDeletionMutation(
            UUID id,
            String email,
            String name,
            String bio,
            String phone,
            String role,
            String profileImagePath,
            String profileImageUrl,
            OffsetDateTime deactivatedAt,
            OffsetDateTime deletedAt,
            OffsetDateTime anonymizedAt,
            OffsetDateTime deletionRequestedAt,
            OffsetDateTime deletionCompletedAt,
            String deletionReason,
            String deletedEmailHash
    ) {
    }
}
