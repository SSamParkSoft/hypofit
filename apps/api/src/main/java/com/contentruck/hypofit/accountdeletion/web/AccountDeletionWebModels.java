package com.contentruck.hypofit.accountdeletion.web;

import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.AuthenticatedCreateCommand;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.ConfirmCommand;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.PublicCreateCommand;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.ResendCommand;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.VerifyCommand;
import com.contentruck.hypofit.accountdeletion.domain.AccountDeletionRequestReadModel;
import com.contentruck.hypofit.accountdeletion.domain.AccountDeletionVerificationReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class AccountDeletionWebModels {

    private AccountDeletionWebModels() {
    }

    public record PublicCreateRequest(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 5, maxLength = 320)
            String email,
            @Schema(types = {"null", "string"}, maxLength = 100)
            @JsonProperty("requester_name") String requesterName,
            @Schema(types = {"null", "string"}, maxLength = 1000)
            String reason
    ) {
        PublicCreateCommand toCommand() {
            return new PublicCreateCommand(email, requesterName, reason);
        }
    }

    public record AuthenticatedCreateRequest(
            @Schema(types = {"null", "string"}, maxLength = 1000)
            String reason
    ) {
        AuthenticatedCreateCommand toCommand() {
            return new AuthenticatedCreateCommand(reason);
        }
    }

    public record VerifyRequest(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid")
            @JsonProperty("request_id") UUID requestId,
            @Schema(types = {"null", "string"}, pattern = "^\\d{6}$")
            String code,
            @Schema(types = {"null", "string"}, minLength = 8, maxLength = 500)
            String token
    ) {
        VerifyCommand toCommand() {
            return new VerifyCommand(requestId, code, token);
        }
    }

    public record ResendRequest(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid")
            @JsonProperty("request_id") UUID requestId
    ) {
        ResendCommand toCommand() {
            return new ResendCommand(requestId);
        }
    }

    public record ConfirmRequest(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid")
            @JsonProperty("request_id") UUID requestId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 32, maxLength = 500)
            @JsonProperty("deletion_authorization") String deletionAuthorization,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            boolean confirm
    ) {
        ConfirmCommand toCommand() {
            return new ConfirmCommand(requestId, deletionAuthorization, confirm);
        }
    }

    public record AccountDeletionRequestResponse(
            UUID id,
            @JsonProperty("user_id") UUID userId,
            String email,
            @JsonProperty("email_hash") String emailHash,
            @JsonProperty("email_redacted_at") OffsetDateTime emailRedactedAt,
            @JsonProperty("requester_name") String requesterName,
            String reason,
            @Schema(allowableValues = {"requested", "verified", "in_review", "completed", "rejected", "canceled"})
            String status,
            String source,
            String result,
            @JsonProperty("retention_note") String retentionNote,
            @JsonProperty("retention_until") OffsetDateTime retentionUntil,
            @JsonProperty("auth_user_delete_status") String authUserDeleteStatus,
            @JsonProperty("auth_user_deleted_at") OffsetDateTime authUserDeletedAt,
            @JsonProperty("auth_user_delete_error_code") String authUserDeleteErrorCode,
            @JsonProperty("verified_at") OffsetDateTime verifiedAt,
            @JsonProperty("verification_expires_at") OffsetDateTime verificationExpiresAt,
            @JsonProperty("verification_resend_available_at") OffsetDateTime verificationResendAvailableAt,
            @JsonProperty("debug_verification_code") String debugVerificationCode,
            @JsonProperty("created_at") OffsetDateTime createdAt,
            @JsonProperty("updated_at") OffsetDateTime updatedAt
    ) {
        static AccountDeletionRequestResponse from(AccountDeletionRequestReadModel model) {
            return new AccountDeletionRequestResponse(
                    model.id(),
                    model.userId(),
                    model.email(),
                    model.emailHash(),
                    model.emailRedactedAt(),
                    model.requesterName(),
                    model.reason(),
                    model.status(),
                    model.source(),
                    model.result(),
                    model.retentionNote(),
                    model.retentionUntil(),
                    model.authUserDeleteStatus(),
                    model.authUserDeletedAt(),
                    model.authUserDeleteErrorCode(),
                    model.verifiedAt(),
                    model.verificationExpiresAt(),
                    model.verificationResendAvailableAt(),
                    model.debugVerificationCode(),
                    model.createdAt(),
                    model.updatedAt()
            );
        }
    }

    public record PublicAccountDeletionRequestResponse(
            UUID id,
            String email,
            @Schema(allowableValues = {"requested", "verified", "in_review", "completed", "rejected", "canceled"})
            String status,
            String source,
            String result,
            @JsonProperty("verified_at") OffsetDateTime verifiedAt,
            @JsonProperty("verification_expires_at") OffsetDateTime verificationExpiresAt,
            @JsonProperty("verification_resend_available_at") OffsetDateTime verificationResendAvailableAt,
            @JsonProperty("debug_verification_code") String debugVerificationCode,
            @JsonProperty("created_at") OffsetDateTime createdAt,
            @JsonProperty("updated_at") OffsetDateTime updatedAt
    ) {
        static PublicAccountDeletionRequestResponse from(AccountDeletionRequestReadModel model) {
            return new PublicAccountDeletionRequestResponse(
                    model.id(),
                    model.email(),
                    model.status(),
                    model.source(),
                    model.result(),
                    model.verifiedAt(),
                    model.verificationExpiresAt(),
                    model.verificationResendAvailableAt(),
                    model.debugVerificationCode(),
                    model.createdAt(),
                    model.updatedAt()
            );
        }
    }

    public record AccountDeletionVerificationResponse(
            AccountDeletionRequestResponse request,
            @JsonProperty("deletion_authorization") String deletionAuthorization,
            @JsonProperty("deletion_authorization_expires_at") OffsetDateTime deletionAuthorizationExpiresAt
    ) {
        static AccountDeletionVerificationResponse from(AccountDeletionVerificationReadModel model) {
            return new AccountDeletionVerificationResponse(
                    AccountDeletionRequestResponse.from(model.request()),
                    model.deletionAuthorization(),
                    model.deletionAuthorizationExpiresAt()
            );
        }
    }

    public record PublicAccountDeletionVerificationResponse(
            PublicAccountDeletionRequestResponse request,
            @JsonProperty("deletion_authorization") String deletionAuthorization,
            @JsonProperty("deletion_authorization_expires_at") OffsetDateTime deletionAuthorizationExpiresAt
    ) {
        static PublicAccountDeletionVerificationResponse from(AccountDeletionVerificationReadModel model) {
            return new PublicAccountDeletionVerificationResponse(
                    PublicAccountDeletionRequestResponse.from(model.request()),
                    model.deletionAuthorization(),
                    model.deletionAuthorizationExpiresAt()
            );
        }
    }
}
