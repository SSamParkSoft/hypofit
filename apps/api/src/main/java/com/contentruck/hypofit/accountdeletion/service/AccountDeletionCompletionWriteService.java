package com.contentruck.hypofit.accountdeletion.service;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionAuthCleanupGateway.AuthCleanupResult;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.AccountDeletionRequestMutation;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.AccountDeletionRequestRecord;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.UserAccountRecord;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.UserDeletionMutation;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountDeletionCompletionWriteService {

    private final AccountDeletionRepository repository;

    public AccountDeletionCompletionWriteService(AccountDeletionRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void completeWithoutActiveAccount(AccountDeletionRequestRecord request, String emailHash) {
        OffsetDateTime now = now();
        repository.saveRequest(new AccountDeletionRequestMutation(
                request.id(),
                request.userId(),
                AccountDeletionCleanupPolicy.redactedRequestEmail(request.id()),
                emailHash,
                now,
                null,
                request.reason(),
                "completed",
                request.source(),
                null,
                null,
                null,
                request.verificationAttemptCount(),
                null,
                null,
                request.verificationSendCount(),
                request.verificationWindowStartedAt(),
                null,
                null,
                request.verifiedAt(),
                null,
                now,
                "no_matching_active_account",
                AccountDeletionCleanupPolicy.buildRetentionNote("no_profile_image"),
                AccountDeletionCleanupPolicy.retentionUntil(now),
                request.authUserDeleteStatus(),
                request.authUserDeletedAt(),
                request.authUserDeleteErrorCode(),
                request.createdAt(),
                now
        ));
        Map<String, Object> completionMetadata = new LinkedHashMap<>();
        completionMetadata.put("source", request.source());
        completionMetadata.put("email_hash", emailHash);
        repository.recordAuditEvent(
                null,
                "system",
                "account_deletion_completed_without_active_account",
                "account_deletion_request",
                request.id(),
                null,
                completionMetadata
        );
    }

    @Transactional
    public InitialDeletionState commitInitialDeletionState(
            UserAccountRecord user,
            AccountDeletionRequestRecord request,
            String reason,
            String actorType,
            String emailHash
    ) {
        OffsetDateTime now = now();
        String profileImagePath = AccountDeletionCleanupPolicy.normalizeProfileImagePath(user.profileImagePath());
        String initialProfileImagePurgeStatus = profileImagePath == null
                ? "no_profile_image"
                : "pending_profile_image_purge";
        UUID requestId = request == null ? UUID.randomUUID() : request.id();
        OffsetDateTime requestCreatedAt = request == null ? now : request.createdAt();
        int disabledPushDevices = repository.disablePushDevices(user.id(), now, "account_deleted", now);

        repository.saveUserDeletion(new UserDeletionMutation(
                user.id(),
                AccountDeletionCleanupPolicy.deletedUserEmail(user.id()),
                AccountDeletionCleanupPolicy.DELETED_USER_NAME,
                null,
                null,
                user.role(),
                null,
                null,
                now,
                now,
                now,
                user.deletionRequestedAt() == null ? now : user.deletionRequestedAt(),
                now,
                reason,
                emailHash
        ));

        repository.saveRequest(new AccountDeletionRequestMutation(
                requestId,
                user.id(),
                AccountDeletionCleanupPolicy.redactedRequestEmail(requestId),
                emailHash,
                now,
                null,
                reason,
                "completed",
                request == null ? AccountDeletionService.AUTHENTICATED_SOURCE : request.source(),
                null,
                null,
                null,
                request == null ? 0 : request.verificationAttemptCount(),
                null,
                null,
                request == null ? 0 : request.verificationSendCount(),
                request == null ? null : request.verificationWindowStartedAt(),
                null,
                null,
                request == null ? null : request.verifiedAt(),
                user.id(),
                now,
                "account_deleted_and_direct_identifiers_anonymized",
                AccountDeletionCleanupPolicy.buildRetentionNote(initialProfileImagePurgeStatus),
                AccountDeletionCleanupPolicy.retentionUntil(now),
                "pending",
                null,
                null,
                requestCreatedAt,
                now
        ));

        repository.recordAuditEvent(
                user.id(),
                "system",
                "account_deletion_email_redacted",
                "account_deletion_request",
                requestId,
                null,
                Map.of(
                        "account_deletion_request_id", requestId.toString(),
                        "email_hash", emailHash
                )
        );
        repository.recordAuditEvent(
                user.id(),
                actorType,
                "account_deletion_completed",
                "user",
                user.id(),
                reason,
                Map.of(
                        "account_deletion_request_id", requestId.toString(),
                        "email_hash", emailHash,
                        "had_profile_image", profileImagePath != null,
                        "profile_image_purge_status", initialProfileImagePurgeStatus,
                        "disabled_push_device_count", disabledPushDevices
                )
        );

        return new InitialDeletionState(requestId, user.id(), profileImagePath, initialProfileImagePurgeStatus);
    }

    @Transactional
    public void persistProfileImagePurgeResult(
            UUID requestId,
            UUID actorUserId,
            String profileImagePath,
            String initialProfileImagePurgeStatus,
            String profileImagePurgeStatus
    ) {
        if (Objects.equals(profileImagePurgeStatus, initialProfileImagePurgeStatus)) {
            return;
        }

        AccountDeletionRequestRecord request = requireRequest(requestId);
        OffsetDateTime now = now();
        repository.saveRequest(new AccountDeletionRequestMutation(
                request.id(),
                request.userId(),
                request.email(),
                request.emailHash(),
                request.emailRedactedAt(),
                request.requesterName(),
                request.reason(),
                request.status(),
                request.source(),
                request.verificationTokenHash(),
                request.verificationCodeHash(),
                request.verificationExpiresAt(),
                request.verificationAttemptCount(),
                request.verificationResendAvailableAt(),
                request.verificationLockedAt(),
                request.verificationSendCount(),
                request.verificationWindowStartedAt(),
                request.deletionAuthorizationHash(),
                request.deletionAuthorizationExpiresAt(),
                request.verifiedAt(),
                request.processedBy(),
                request.processedAt(),
                request.result(),
                AccountDeletionCleanupPolicy.buildRetentionNote(profileImagePurgeStatus),
                request.retentionUntil(),
                request.authUserDeleteStatus(),
                request.authUserDeletedAt(),
                request.authUserDeleteErrorCode(),
                request.createdAt(),
                now
        ));
        repository.recordAuditEvent(
                actorUserId,
                "system",
                "account_deletion_profile_image_purge_completed",
                "account_deletion_request",
                request.id(),
                null,
                Map.of(
                        "had_profile_image", profileImagePath != null,
                        "profile_image_purge_status", profileImagePurgeStatus
                )
        );
    }

    @Transactional
    public void persistCompletionAuthCleanupResult(UUID requestId, UUID actorUserId, AuthCleanupResult authCleanup) {
        AccountDeletionRequestRecord request = requireRequest(requestId);
        OffsetDateTime now = now();
        OffsetDateTime authDeletedAt = AccountDeletionCleanupPolicy.successAuthCleanup(authCleanup.status())
                ? now
                : request.authUserDeletedAt();
        repository.saveRequest(new AccountDeletionRequestMutation(
                request.id(),
                request.userId(),
                request.email(),
                request.emailHash(),
                request.emailRedactedAt(),
                request.requesterName(),
                request.reason(),
                request.status(),
                request.source(),
                request.verificationTokenHash(),
                request.verificationCodeHash(),
                request.verificationExpiresAt(),
                request.verificationAttemptCount(),
                request.verificationResendAvailableAt(),
                request.verificationLockedAt(),
                request.verificationSendCount(),
                request.verificationWindowStartedAt(),
                request.deletionAuthorizationHash(),
                request.deletionAuthorizationExpiresAt(),
                request.verifiedAt(),
                request.processedBy(),
                request.processedAt(),
                request.result(),
                request.retentionNote(),
                request.retentionUntil(),
                authCleanup.status(),
                authDeletedAt,
                authCleanup.errorCode(),
                request.createdAt(),
                now
        ));
        Map<String, Object> authMetadata = new LinkedHashMap<>();
        authMetadata.put("auth_user_delete_status", authCleanup.status());
        authMetadata.put("auth_user_delete_error_code", authCleanup.errorCode());
        repository.recordAuditEvent(
                actorUserId,
                "system",
                AccountDeletionCleanupPolicy.successAuthCleanup(authCleanup.status())
                        ? "account_deletion_auth_user_deleted"
                        : "account_deletion_auth_user_delete_failed",
                "account_deletion_request",
                request.id(),
                null,
                authMetadata
        );
        if (AccountDeletionCleanupPolicy.successAuthCleanup(authCleanup.status())) {
            repository.recordAuditEvent(
                    actorUserId,
                    "system",
                    "account_deletion_rejoin_allowed",
                    "account_deletion_request",
                    request.id(),
                    null,
                    Map.of("auth_user_delete_status", authCleanup.status())
            );
        }
    }

    @Transactional
    public void persistRetryAuthCleanupResult(UUID requestId, UUID actorUserId, AuthCleanupResult authCleanup) {
        AccountDeletionRequestRecord request = requireRequest(requestId);
        OffsetDateTime now = now();
        OffsetDateTime authDeletedAt = AccountDeletionCleanupPolicy.successAuthCleanup(authCleanup.status())
                ? now
                : request.authUserDeletedAt();
        repository.saveRequest(new AccountDeletionRequestMutation(
                request.id(),
                request.userId(),
                request.email(),
                request.emailHash(),
                request.emailRedactedAt(),
                request.requesterName(),
                request.reason(),
                request.status(),
                request.source(),
                request.verificationTokenHash(),
                request.verificationCodeHash(),
                request.verificationExpiresAt(),
                request.verificationAttemptCount(),
                request.verificationResendAvailableAt(),
                request.verificationLockedAt(),
                request.verificationSendCount(),
                request.verificationWindowStartedAt(),
                request.deletionAuthorizationHash(),
                request.deletionAuthorizationExpiresAt(),
                request.verifiedAt(),
                request.processedBy(),
                request.processedAt(),
                request.result(),
                request.retentionNote(),
                request.retentionUntil(),
                authCleanup.status(),
                authDeletedAt,
                authCleanup.errorCode(),
                request.createdAt(),
                now
        ));

        Map<String, Object> baseMetadata = new LinkedHashMap<>();
        baseMetadata.put("source", "admin_api");
        baseMetadata.put("auth_user_delete_status", authCleanup.status());
        baseMetadata.put("auth_user_delete_error_code", authCleanup.errorCode());
        baseMetadata.put("triggered_by_operator_user_id", actorUserId.toString());
        repository.recordAuditEvent(
                actorUserId,
                "operator",
                AccountDeletionCleanupPolicy.successAuthCleanup(authCleanup.status())
                        ? "account_deletion_auth_user_deleted"
                        : "account_deletion_auth_user_delete_failed",
                "account_deletion_request",
                request.id(),
                null,
                baseMetadata
        );
        if (AccountDeletionCleanupPolicy.successAuthCleanup(authCleanup.status())) {
            repository.recordAuditEvent(
                    actorUserId,
                    "operator",
                    "account_deletion_rejoin_allowed",
                    "account_deletion_request",
                    request.id(),
                    null,
                    Map.of(
                            "source", "admin_api",
                            "auth_user_delete_status", authCleanup.status(),
                            "triggered_by_operator_user_id", actorUserId.toString()
                    )
            );
        }
    }

    private AccountDeletionRequestRecord requireRequest(UUID requestId) {
        return repository.findRequest(requestId)
                .orElseThrow(() -> new IllegalStateException("Account deletion request is missing after completion write"));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    public record InitialDeletionState(
            UUID requestId,
            UUID userId,
            String profileImagePath,
            String initialProfileImagePurgeStatus
    ) {
    }
}
