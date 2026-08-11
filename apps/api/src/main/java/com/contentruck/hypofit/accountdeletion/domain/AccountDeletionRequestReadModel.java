package com.contentruck.hypofit.accountdeletion.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AccountDeletionRequestReadModel(
        UUID id,
        UUID userId,
        String email,
        String emailHash,
        OffsetDateTime emailRedactedAt,
        String requesterName,
        String reason,
        String status,
        String source,
        String result,
        String retentionNote,
        OffsetDateTime retentionUntil,
        String authUserDeleteStatus,
        OffsetDateTime authUserDeletedAt,
        String authUserDeleteErrorCode,
        OffsetDateTime verifiedAt,
        OffsetDateTime verificationExpiresAt,
        OffsetDateTime verificationResendAvailableAt,
        String debugVerificationCode,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public AccountDeletionRequestReadModel withResult(String nextResult) {
        return new AccountDeletionRequestReadModel(
                id,
                userId,
                email,
                emailHash,
                emailRedactedAt,
                requesterName,
                reason,
                status,
                source,
                nextResult,
                retentionNote,
                retentionUntil,
                authUserDeleteStatus,
                authUserDeletedAt,
                authUserDeleteErrorCode,
                verifiedAt,
                verificationExpiresAt,
                verificationResendAvailableAt,
                debugVerificationCode,
                createdAt,
                updatedAt
        );
    }

    public AccountDeletionRequestReadModel withDebugVerificationCode(String code) {
        return new AccountDeletionRequestReadModel(
                id,
                userId,
                email,
                emailHash,
                emailRedactedAt,
                requesterName,
                reason,
                status,
                source,
                result,
                retentionNote,
                retentionUntil,
                authUserDeleteStatus,
                authUserDeletedAt,
                authUserDeleteErrorCode,
                verifiedAt,
                verificationExpiresAt,
                verificationResendAvailableAt,
                code,
                createdAt,
                updatedAt
        );
    }
}
