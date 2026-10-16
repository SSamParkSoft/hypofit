package com.contentruck.hypofit.accountdeletion.service;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.AccountDeletionRequestMutation;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.AccountDeletionRequestRecord;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.UserAccountRecord;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.UserDeletionMutation;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountDeletionVerificationService {

    private static final int VERIFICATION_MAX_ATTEMPTS = 5;
    private static final Duration DELETION_AUTHORIZATION_TTL = Duration.ofMinutes(5);

    private final AccountDeletionRepository repository;
    private final AccountDeletionVerificationSecurity verificationSecurity;

    public AccountDeletionVerificationService(
            AccountDeletionRepository repository,
            AccountDeletionVerificationSecurity verificationSecurity
    ) {
        this.repository = repository;
        this.verificationSecurity = verificationSecurity;
    }

    @Transactional
    public VerificationResult verifyPublic(UUID requestId, String code, String token) {
        return verify(requestId, code, token, null, AccountDeletionService.PUBLIC_SOURCE, "public");
    }

    @Transactional
    public VerificationResult verifyAuthenticated(UUID userId, UUID requestId, String code, String token) {
        if (userId == null) {
            throw new UserProfileMissingException();
        }
        UserAccountRecord user = repository.findUserAccount(userId).orElseThrow(UserProfileMissingException::new);
        return verify(requestId, code, token, user, AccountDeletionService.AUTHENTICATED_SOURCE, "user");
    }

    private VerificationResult verify(UUID requestId, String code, String token, UserAccountRecord user, String source, String actorType) {
        AccountDeletionRequestRecord request = repository.findRequestForUpdate(requestId).orElse(null);
        if (request == null || !source.equals(request.source()) || (user != null && !user.id().equals(request.userId()))) {
            throw notFound("Account deletion request not found");
        }
        return verifyRequestCode(request, code, token, user, actorType);
    }

    private VerificationResult verifyRequestCode(
            AccountDeletionRequestRecord request,
            String code,
            String legacyToken,
            UserAccountRecord expectedUser,
            String actorType
    ) {
        OffsetDateTime now = now();
        if (isClosedRequest(request)) {
            throw conflict("Account deletion request is no longer verifiable");
        }
        if ("verified".equals(request.status())) {
            throw conflict("Account deletion code has already been verified");
        }
        if (request.verificationLockedAt() != null || request.verificationAttemptCount() >= VERIFICATION_MAX_ATTEMPTS) {
            throw tooManyRequests("Verification attempts exceeded. Request a new code");
        }
        boolean legacyMode = legacyToken != null && request.verificationTokenHash() != null;
        if (!legacyMode && (request.verificationCodeHash() == null || request.verificationExpiresAt() == null)) {
            throw conflict("Account deletion request is not awaiting verification");
        }
        if (!legacyMode && !request.verificationExpiresAt().isAfter(now)) {
            throw gone("Verification code has expired");
        }

        String providedHash = legacyMode
                ? verificationSecurity.sha256(legacyToken)
                : verificationSecurity.hashVerificationCode(request.id(), Objects.requireNonNullElse(code, ""));
        String expectedHash = legacyMode ? request.verificationTokenHash() : request.verificationCodeHash();
        if (!Objects.equals(expectedHash, providedHash)) {
            int attempts = request.verificationAttemptCount() + 1;
            OffsetDateTime lockedAt = attempts >= VERIFICATION_MAX_ATTEMPTS ? now : null;
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
                    attempts,
                    request.verificationResendAvailableAt(),
                    lockedAt,
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
                    request.authUserDeleteStatus(),
                    request.authUserDeletedAt(),
                    request.authUserDeleteErrorCode(),
                    request.createdAt(),
                    now
            ));
            repository.recordAuditEvent(
                    request.userId(),
                    actorType,
                    "account_deletion_verification_code_failed",
                    "account_deletion_request",
                    request.id(),
                    null,
                    Map.of(
                            "attempt_count", attempts,
                            "locked", lockedAt != null,
                            "source", request.source()
                    )
            );
            return new VerificationResult(null);
        }

        UserAccountRecord matchedUser = expectedUser;
        if (matchedUser == null && request.userId() != null) {
            matchedUser = repository.findUserAccount(request.userId()).orElse(null);
        }
        if (matchedUser == null) {
            matchedUser = repository.findUserByEmail(request.email()).orElse(null);
        }
        UserAccountRecord activeMatchedUser = activeUser(matchedUser);
        String deletionAuthorization = verificationSecurity.generateDeletionAuthorization();
        OffsetDateTime deletionAuthorizationExpiresAt = now.plus(DELETION_AUTHORIZATION_TTL);
        AccountDeletionRequestReadModel saved = repository.saveRequest(new AccountDeletionRequestMutation(
                request.id(),
                activeMatchedUser == null ? request.userId() : activeMatchedUser.id(),
                request.email(),
                request.emailHash(),
                request.emailRedactedAt(),
                request.requesterName(),
                request.reason(),
                "verified",
                request.source(),
                null,
                null,
                null,
                request.verificationAttemptCount(),
                request.verificationResendAvailableAt(),
                null,
                request.verificationSendCount(),
                request.verificationWindowStartedAt(),
                verificationSecurity.sha256(deletionAuthorization),
                deletionAuthorizationExpiresAt,
                now,
                request.processedBy(),
                request.processedAt(),
                request.result(),
                request.retentionNote(),
                request.retentionUntil(),
                request.authUserDeleteStatus(),
                request.authUserDeletedAt(),
                request.authUserDeleteErrorCode(),
                request.createdAt(),
                now
        ));

        if (activeMatchedUser != null
                && (activeMatchedUser.deletionRequestedAt() == null || !Objects.equals(activeMatchedUser.deletionReason(), request.reason()))) {
            repository.saveUserDeletion(new UserDeletionMutation(
                    activeMatchedUser.id(),
                    activeMatchedUser.email(),
                    activeMatchedUser.name(),
                    activeMatchedUser.bio(),
                    activeMatchedUser.phone(),
                    activeMatchedUser.role(),
                    activeMatchedUser.profileImagePath(),
                    activeMatchedUser.profileImageUrl(),
                    activeMatchedUser.deactivatedAt(),
                    activeMatchedUser.deletedAt(),
                    activeMatchedUser.anonymizedAt(),
                    activeMatchedUser.deletionRequestedAt() == null ? now : activeMatchedUser.deletionRequestedAt(),
                    activeMatchedUser.deletionCompletedAt(),
                    request.reason(),
                    activeMatchedUser.deletedEmailHash()
            ));
        }

        Map<String, Object> verifiedMetadata = new LinkedHashMap<>();
        verifiedMetadata.put("source", request.source());
        verifiedMetadata.put("email_hash", request.emailHash());
        verifiedMetadata.put("verification_status", "verified");
        verifiedMetadata.put("matched_active_account", activeMatchedUser != null);
        repository.recordAuditEvent(
                activeMatchedUser == null ? null : activeMatchedUser.id(),
                actorType,
                "account_deletion_verified",
                "account_deletion_request",
                request.id(),
                request.reason(),
                verifiedMetadata
        );

        return new VerificationResult(new AccountDeletionVerificationReadModel(saved, deletionAuthorization, deletionAuthorizationExpiresAt));
    }

    private boolean isClosedRequest(AccountDeletionRequestRecord request) {
        return "completed".equals(request.status())
                || "rejected".equals(request.status())
                || "canceled".equals(request.status());
    }

    private UserAccountRecord activeUser(UserAccountRecord user) {
        if (user == null) {
            return null;
        }
        if (user.deletedAt() != null || user.deactivatedAt() != null) {
            return null;
        }
        return user;
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private HypofitException notFound(String detail) {
        return new HypofitException("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), detail);
    }

    private HypofitException conflict(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
    }

    private HypofitException tooManyRequests(String detail) {
        return new HypofitException("request_rate_limited", "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", 429, detail);
    }

    private HypofitException gone(String detail) {
        return new HypofitException("request_expired", "요청이 만료되었어요.", HttpStatus.GONE.value(), detail);
    }

    public record VerificationResult(AccountDeletionVerificationReadModel verification) {

        AccountDeletionVerificationReadModel requireVerified() {
            // Why: attempts, lock and audit must commit before the caller returns a 400.
            if (verification == null) {
                throw new HypofitException("request_failed", "요청을 처리하지 못했어요.", HttpStatus.BAD_REQUEST.value(), "Verification code is invalid");
            }
            return verification;
        }
    }
}
