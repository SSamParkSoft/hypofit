package com.contentruck.hypofit.accountdeletion.service;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionAuthCleanupGateway.AuthCleanupResult;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionCommands.AuthenticatedCreateCommand;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionCommands.ConfirmCommand;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionCommands.PublicCreateCommand;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionCommands.ResendCommand;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionCommands.VerifyCommand;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.AccountDeletionRequestMutation;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.AccountDeletionRequestRecord;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.UserAccountRecord;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.UserDeletionMutation;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountDeletionService {

    static final String PUBLIC_SOURCE = "public_web";
    static final String AUTHENTICATED_SOURCE = "mobile_app";

    private static final Duration VERIFICATION_CODE_TTL = Duration.ofMinutes(10);
    private static final Duration VERIFICATION_RESEND_COOLDOWN = Duration.ofSeconds(90);
    private static final int VERIFICATION_MAX_ATTEMPTS = 5;
    private static final int VERIFICATION_MAX_SENDS_PER_HOUR = 5;
    private static final Duration VERIFICATION_SEND_WINDOW = Duration.ofHours(1);
    private static final Duration DELETION_AUTHORIZATION_TTL = Duration.ofMinutes(5);

    private final AccountDeletionRepository repository;
    private final AccountDeletionEmailGateway emailGateway;
    private final AccountDeletionAuthCleanupGateway authCleanupGateway;
    private final AccountDeletionProfileImagePurgeGateway profileImagePurgeGateway;
    private final AccountDeletionCompletionWriteService completionWriteService;
    private final AccountDeletionAdminService adminService;
    private final AccountDeletionVerificationSecurity verificationSecurity;
    private final HypofitProperties properties;

    public AccountDeletionService(
            AccountDeletionRepository repository,
            AccountDeletionEmailGateway emailGateway,
            AccountDeletionAuthCleanupGateway authCleanupGateway,
            AccountDeletionProfileImagePurgeGateway profileImagePurgeGateway,
            AccountDeletionCompletionWriteService completionWriteService,
            AccountDeletionAdminService adminService,
            AccountDeletionVerificationSecurity verificationSecurity,
            HypofitProperties properties
    ) {
        this.repository = repository;
        this.emailGateway = emailGateway;
        this.authCleanupGateway = authCleanupGateway;
        this.profileImagePurgeGateway = profileImagePurgeGateway;
        this.completionWriteService = completionWriteService;
        this.adminService = adminService;
        this.verificationSecurity = verificationSecurity;
        this.properties = properties;
    }

    @Transactional
    public AccountDeletionRequestReadModel createPublicRequest(PublicCreateCommand command) {
        NormalizedPublicCreateInput input = normalizePublicCreate(command);
        OffsetDateTime now = now();
        String emailHash = verificationSecurity.hashEmail(input.email());
        AccountDeletionRequestRecord existing = repository.findLatestPublicRequestByEmailHash(emailHash).orElse(null);

        if (isVerificationRecentlySent(existing, now)) {
            return toReadModel(existing).withResult("verification_code_recently_sent");
        }

        UserAccountRecord matchedUser = repository.findUserByEmail(input.email()).orElse(null);
        UserAccountRecord activeMatchedUser = activeUser(matchedUser);
        String verificationCode = verificationSecurity.generateVerificationCode();
        OffsetDateTime verificationExpiresAt = now.plus(VERIFICATION_CODE_TTL);
        OffsetDateTime resendAvailableAt = now.plus(VERIFICATION_RESEND_COOLDOWN);

        AccountDeletionRequestMutation mutation;
        if (existing != null && isReusableRequest(existing)) {
            VerificationSendWindow sendWindow = recordVerificationSend(existing.verificationSendCount(), existing.verificationWindowStartedAt(), now);
            mutation = new AccountDeletionRequestMutation(
                    existing.id(),
                    activeMatchedUser == null ? null : activeMatchedUser.id(),
                    input.email(),
                    existing.emailHash(),
                    existing.emailRedactedAt(),
                    existing.requesterName(),
                    existing.reason(),
                    "requested",
                    PUBLIC_SOURCE,
                    null,
                    verificationSecurity.hashVerificationCode(existing.id(), verificationCode),
                    verificationExpiresAt,
                    0,
                    resendAvailableAt,
                    null,
                    sendWindow.sendCount(),
                    sendWindow.windowStartedAt(),
                    null,
                    null,
                    existing.verifiedAt(),
                    existing.processedBy(),
                    existing.processedAt(),
                    null,
                    existing.retentionNote(),
                    existing.retentionUntil(),
                    existing.authUserDeleteStatus(),
                    existing.authUserDeletedAt(),
                    existing.authUserDeleteErrorCode(),
                    existing.createdAt(),
                    now
            );
        } else {
            UUID requestId = UUID.randomUUID();
            mutation = new AccountDeletionRequestMutation(
                    requestId,
                    activeMatchedUser == null ? null : activeMatchedUser.id(),
                    input.email(),
                    emailHash,
                    null,
                    input.requesterName(),
                    input.reason(),
                    "requested",
                    PUBLIC_SOURCE,
                    null,
                    verificationSecurity.hashVerificationCode(requestId, verificationCode),
                    verificationExpiresAt,
                    0,
                    resendAvailableAt,
                    null,
                    1,
                    now,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    now,
                    now
            );
        }

        AccountDeletionRequestReadModel saved = repository.saveRequest(mutation);
        Map<String, Object> requestedMetadata = new LinkedHashMap<>();
        requestedMetadata.put("source", PUBLIC_SOURCE);
        requestedMetadata.put("email_hash", saved.emailHash());
        requestedMetadata.put("verification_status", "code_requested");
        repository.recordAuditEvent(
                null,
                "public",
                "account_deletion_requested",
                "account_deletion_request",
                saved.id(),
                input.reason(),
                requestedMetadata
        );
        String emailStatus = emailGateway.sendVerificationCode(saved.email(), verificationCode);
        saved = updateRequestResult(saved.id(), emailStatus, now);
        repository.recordAuditEvent(
                null,
                "system",
                "account_deletion_verification_code_email_status",
                "account_deletion_request",
                saved.id(),
                null,
                Map.of(
                        "source", PUBLIC_SOURCE,
                        "email_status", emailStatus
                )
        );
        return attachDebugVerificationCode(saved, verificationCode);
    }

    @Transactional
    public AccountDeletionVerificationReadModel verifyPublicRequest(VerifyCommand command) {
        NormalizedVerifyInput input = normalizeVerify(command);
        AccountDeletionRequestRecord request = repository.findRequestForUpdate(input.requestId()).orElse(null);
        if (request == null || !PUBLIC_SOURCE.equals(request.source())) {
            throw notFound("Account deletion request not found");
        }
        return verifyRequestCode(request, input.code(), input.token(), null, "public");
    }

    @Transactional
    public AccountDeletionRequestReadModel resendPublicRequest(ResendCommand command) {
        UUID requestId = requireRequestId(command.requestId());
        AccountDeletionRequestRecord request = repository.findRequest(requestId).orElse(null);
        if (request == null || !PUBLIC_SOURCE.equals(request.source())) {
            throw notFound("Account deletion request not found");
        }
        return resendVerificationCode(request, "public");
    }

    public AccountDeletionRequestReadModel confirmPublicRequest(ConfirmCommand command) {
        NormalizedConfirmInput input = normalizeConfirm(command);
        AccountDeletionRequestRecord request = repository.findRequest(input.requestId()).orElse(null);
        if (request == null || !PUBLIC_SOURCE.equals(request.source())) {
            throw notFound("Account deletion request not found");
        }
        return confirmVerifiedDeletion(request, input.deletionAuthorization(), null, "public");
    }

    @Transactional
    public AccountDeletionRequestReadModel createAuthenticatedRequest(UUID userId, AuthenticatedCreateCommand command) {
        String normalizedReason = normalizeOptionalText("reason", command.reason(), 1000);
        UserAccountRecord user = requireUserAccount(userId);
        if (user.deletedAt() != null || user.deactivatedAt() != null) {
            throw conflict("Account is already inactive");
        }

        OffsetDateTime now = now();
        AccountDeletionRequestRecord existing = repository.findLatestRequestForUser(userId).orElse(null);
        if (isVerificationRecentlySent(existing, now) && AUTHENTICATED_SOURCE.equals(existing.source())) {
            return toReadModel(existing).withResult("verification_code_recently_sent");
        }

        String verificationCode = verificationSecurity.generateVerificationCode();
        OffsetDateTime verificationExpiresAt = now.plus(VERIFICATION_CODE_TTL);
        OffsetDateTime resendAvailableAt = now.plus(VERIFICATION_RESEND_COOLDOWN);

        AccountDeletionRequestMutation mutation;
        if (existing != null && isReusableAuthenticatedRequest(existing, userId)) {
            VerificationSendWindow sendWindow = recordVerificationSend(existing.verificationSendCount(), existing.verificationWindowStartedAt(), now);
            mutation = new AccountDeletionRequestMutation(
                    existing.id(),
                    existing.userId(),
                    existing.email(),
                    existing.emailHash(),
                    existing.emailRedactedAt(),
                    existing.requesterName(),
                    normalizedReason,
                    "requested",
                    AUTHENTICATED_SOURCE,
                    null,
                    verificationSecurity.hashVerificationCode(existing.id(), verificationCode),
                    verificationExpiresAt,
                    0,
                    resendAvailableAt,
                    null,
                    sendWindow.sendCount(),
                    sendWindow.windowStartedAt(),
                    null,
                    null,
                    existing.verifiedAt(),
                    existing.processedBy(),
                    existing.processedAt(),
                    null,
                    existing.retentionNote(),
                    existing.retentionUntil(),
                    existing.authUserDeleteStatus(),
                    existing.authUserDeletedAt(),
                    existing.authUserDeleteErrorCode(),
                    existing.createdAt(),
                    now
            );
        } else {
            UUID requestId = UUID.randomUUID();
            mutation = new AccountDeletionRequestMutation(
                    requestId,
                    user.id(),
                    user.email(),
                    verificationSecurity.hashEmail(user.email()),
                    null,
                    user.name(),
                    normalizedReason,
                    "requested",
                    AUTHENTICATED_SOURCE,
                    null,
                    verificationSecurity.hashVerificationCode(requestId, verificationCode),
                    verificationExpiresAt,
                    0,
                    resendAvailableAt,
                    null,
                    1,
                    now,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    now,
                    now
            );
            user = repository.saveUserDeletion(new UserDeletionMutation(
                    user.id(),
                    user.email(),
                    user.name(),
                    user.bio(),
                    user.phone(),
                    user.role(),
                    user.profileImagePath(),
                    user.profileImageUrl(),
                    user.deactivatedAt(),
                    user.deletedAt(),
                    user.anonymizedAt(),
                    now,
                    user.deletionCompletedAt(),
                    normalizedReason,
                    user.deletedEmailHash()
            ));
        }

        AccountDeletionRequestReadModel saved = repository.saveRequest(mutation);
        repository.recordAuditEvent(
                user.id(),
                "user",
                "account_deletion_requested",
                "account_deletion_request",
                saved.id(),
                normalizedReason,
                Map.of(
                        "source", AUTHENTICATED_SOURCE,
                        "verification_status", "code_requested"
                )
        );
        String emailStatus = emailGateway.sendVerificationCode(saved.email(), verificationCode);
        saved = updateRequestResult(saved.id(), emailStatus, now);
        repository.recordAuditEvent(
                user.id(),
                "system",
                "account_deletion_verification_code_email_status",
                "account_deletion_request",
                saved.id(),
                null,
                Map.of(
                        "source", AUTHENTICATED_SOURCE,
                        "email_status", emailStatus
                )
        );
        return attachDebugVerificationCode(saved, verificationCode);
    }

    @Transactional
    public AccountDeletionVerificationReadModel verifyAuthenticatedRequest(UUID userId, VerifyCommand command) {
        NormalizedVerifyInput input = normalizeVerify(command);
        UserAccountRecord user = requireUserAccount(userId);
        AccountDeletionRequestRecord request = repository.findRequestForUpdate(input.requestId()).orElse(null);
        ensureAuthenticatedOwner(request, user);
        return verifyRequestCode(request, input.code(), input.token(), user, "user");
    }

    @Transactional
    public AccountDeletionRequestReadModel resendAuthenticatedRequest(UUID userId, ResendCommand command) {
        UUID requestId = requireRequestId(command.requestId());
        UserAccountRecord user = requireUserAccount(userId);
        AccountDeletionRequestRecord request = repository.findRequest(requestId).orElse(null);
        ensureAuthenticatedOwner(request, user);
        return resendVerificationCode(request, "user");
    }

    public AccountDeletionRequestReadModel confirmAuthenticatedRequest(UUID userId, ConfirmCommand command) {
        NormalizedConfirmInput input = normalizeConfirm(command);
        UserAccountRecord user = requireUserAccount(userId);
        AccountDeletionRequestRecord request = repository.findRequest(input.requestId()).orElse(null);
        ensureAuthenticatedOwner(request, user);
        return confirmVerifiedDeletion(request, input.deletionAuthorization(), user, "user");
    }

    public AccountDeletionRequestReadModel deactivateCurrentUser(UUID userId, AuthenticatedCreateCommand command) {
        String normalizedReason = normalizeOptionalText("reason", command.reason(), 1000);
        UserAccountRecord user = requireUserAccount(userId);
        if (user.deletedAt() != null || user.deactivatedAt() != null) {
            throw conflict("Account is already inactive");
        }

        AccountDeletionRequestRecord request = repository.findLatestRequestForUser(userId).orElse(null);
        if (request == null || !isReusableRequest(request)) {
            request = null;
        }
        String reason = normalizedReason != null
                ? normalizedReason
                : request == null ? null : request.reason();
        return performCompletedDeletion(user, request, reason, "user");
    }

    @Transactional(readOnly = true)
    public List<AdminAccountDeletionRequestView> listAdminRequests(String status, int limit) {
        return adminService.listRequests(status, limit);
    }

    public AdminAccountDeletionRequestView retryAuthCleanup(UUID requestId, UUID actorUserId) {
        return adminService.retryAuthCleanup(requestId, actorUserId);
    }

    private AccountDeletionVerificationReadModel verifyRequestCode(
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
            throw badRequest("Verification code is invalid");
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

        return new AccountDeletionVerificationReadModel(saved, deletionAuthorization, deletionAuthorizationExpiresAt);
    }

    private AccountDeletionRequestReadModel resendVerificationCode(AccountDeletionRequestRecord request, String actorType) {
        OffsetDateTime now = now();
        if (isClosedRequest(request)) {
            throw conflict("Account deletion request can no longer receive a code");
        }
        if (request.verificationResendAvailableAt() != null && request.verificationResendAvailableAt().isAfter(now)) {
            throw tooManyRequests("Verification code was sent recently");
        }

        VerificationSendWindow sendWindow = recordVerificationSend(
                request.verificationSendCount(),
                request.verificationWindowStartedAt(),
                now
        );
        String verificationCode = verificationSecurity.generateVerificationCode();
        AccountDeletionRequestReadModel saved = repository.saveRequest(new AccountDeletionRequestMutation(
                request.id(),
                request.userId(),
                request.email(),
                request.emailHash(),
                request.emailRedactedAt(),
                request.requesterName(),
                request.reason(),
                "requested",
                request.source(),
                null,
                verificationSecurity.hashVerificationCode(request.id(), verificationCode),
                now.plus(VERIFICATION_CODE_TTL),
                0,
                now.plus(VERIFICATION_RESEND_COOLDOWN),
                null,
                sendWindow.sendCount(),
                sendWindow.windowStartedAt(),
                null,
                null,
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
                "account_deletion_verification_code_resent",
                "account_deletion_request",
                request.id(),
                null,
                Map.of("source", request.source())
        );
        String emailStatus = emailGateway.sendVerificationCode(saved.email(), verificationCode);
        saved = updateRequestResult(saved.id(), emailStatus, now);
        return attachDebugVerificationCode(saved, verificationCode);
    }

    private AccountDeletionRequestReadModel confirmVerifiedDeletion(
            AccountDeletionRequestRecord request,
            String deletionAuthorization,
            UserAccountRecord expectedUser,
            String actorType
    ) {
        OffsetDateTime now = now();
        if (!"verified".equals(request.status())) {
            throw conflict("Verify the account deletion code first");
        }
        if (request.deletionAuthorizationHash() == null || request.deletionAuthorizationExpiresAt() == null) {
            throw conflict("Account deletion confirmation is not available");
        }
        if (!request.deletionAuthorizationExpiresAt().isAfter(now)) {
            throw gone("Account deletion confirmation has expired");
        }
        if (!Objects.equals(request.deletionAuthorizationHash(), verificationSecurity.sha256(deletionAuthorization))) {
            throw badRequest("Account deletion confirmation is invalid");
        }
        if (!repository.claimVerifiedRequest(request.id(), now)) {
            throw conflict("Account deletion is already being processed");
        }

        UserAccountRecord matchedUser = expectedUser;
        if (matchedUser == null && request.userId() != null) {
            matchedUser = repository.findUserAccount(request.userId()).orElse(null);
        }
        if (matchedUser == null) {
            matchedUser = repository.findUserByEmail(request.email()).orElse(null);
        }
        UserAccountRecord activeMatchedUser = activeUser(matchedUser);

        if (activeMatchedUser == null) {
            String emailHash = request.emailHash() == null ? verificationSecurity.hashEmail(request.email()) : request.emailHash();
            completionWriteService.completeWithoutActiveAccount(request, emailHash);
            return repository.findRequest(request.id())
                    .map(this::toReadModel)
                    .orElseThrow(() -> new IllegalStateException("Account deletion request is missing after completion"));
        }
        return performCompletedDeletion(activeMatchedUser, request, request.reason(), actorType);
    }

    private AccountDeletionRequestReadModel performCompletedDeletion(
            UserAccountRecord user,
            AccountDeletionRequestRecord request,
            String reason,
            String actorType
    ) {
        if (user.deletedAt() != null || user.deactivatedAt() != null) {
            throw conflict("Account is already inactive");
        }

        String emailHash = request == null || request.emailHash() == null
                ? verificationSecurity.hashEmail(user.email())
                : request.emailHash();
        AccountDeletionCompletionWriteService.InitialDeletionState initialState =
                completionWriteService.commitInitialDeletionState(
                        user,
                        request,
                        reason,
                        actorType,
                        emailHash
                );
        String profileImagePurgeStatus = profileImagePurgeGateway.purgeProfileImage(initialState.profileImagePath());
        completionWriteService.persistProfileImagePurgeResult(
                initialState.requestId(),
                initialState.userId(),
                initialState.profileImagePath(),
                initialState.initialProfileImagePurgeStatus(),
                profileImagePurgeStatus
        );
        AuthCleanupResult authCleanup = authCleanupGateway.deleteAuthUser(user.id());
        completionWriteService.persistCompletionAuthCleanupResult(initialState.requestId(), initialState.userId(), authCleanup);
        return repository.findRequest(initialState.requestId())
                .map(this::toReadModel)
                .orElseThrow(() -> new IllegalStateException("Account deletion request is missing after completion"));
    }

    private boolean isVerificationRecentlySent(AccountDeletionRequestRecord request, OffsetDateTime now) {
        return request != null
                && isReusableRequest(request)
                && request.verificationResendAvailableAt() != null
                && request.verificationResendAvailableAt().isAfter(now);
    }

    private boolean isReusableRequest(AccountDeletionRequestRecord request) {
        return request != null
                && ("requested".equals(request.status()) || "verified".equals(request.status()) || "in_review".equals(request.status()));
    }

    private boolean isReusableAuthenticatedRequest(AccountDeletionRequestRecord request, UUID userId) {
        return isReusableRequest(request)
                && AUTHENTICATED_SOURCE.equals(request.source())
                && userId.equals(request.userId());
    }

    private boolean isClosedRequest(AccountDeletionRequestRecord request) {
        return "completed".equals(request.status())
                || "rejected".equals(request.status())
                || "canceled".equals(request.status());
    }

    private void ensureAuthenticatedOwner(AccountDeletionRequestRecord request, UserAccountRecord user) {
        if (request == null || !AUTHENTICATED_SOURCE.equals(request.source()) || !user.id().equals(request.userId())) {
            throw notFound("Account deletion request not found");
        }
    }

    private UserAccountRecord requireUserAccount(UUID userId) {
        if (userId == null) {
            throw new UserProfileMissingException();
        }
        return repository.findUserAccount(userId).orElseThrow(UserProfileMissingException::new);
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

    private AccountDeletionRequestReadModel attachDebugVerificationCode(
            AccountDeletionRequestReadModel request,
            String verificationCode
    ) {
        return isLocalDebugEnvironment() ? request.withDebugVerificationCode(verificationCode) : request;
    }

    private boolean isLocalDebugEnvironment() {
        String env = Objects.requireNonNullElse(properties.getEnv(), "").trim().toLowerCase(Locale.ROOT);
        return env.equals("local") || env.equals("test") || env.equals("development");
    }

    private VerificationSendWindow recordVerificationSend(int currentCount, OffsetDateTime windowStartedAt, OffsetDateTime now) {
        if (windowStartedAt == null || !windowStartedAt.plus(VERIFICATION_SEND_WINDOW).isAfter(now)) {
            return new VerificationSendWindow(1, now);
        }
        int nextCount = currentCount + 1;
        if (nextCount > VERIFICATION_MAX_SENDS_PER_HOUR) {
            throw tooManyRequests("Verification code send limit exceeded");
        }
        return new VerificationSendWindow(nextCount, windowStartedAt);
    }

    private NormalizedPublicCreateInput normalizePublicCreate(PublicCreateCommand command) {
        List<FieldError> errors = new ArrayList<>();
        String email = normalizeEmail(command.email(), errors);
        String requesterName = normalizeOptionalText("requester_name", command.requesterName(), 100);
        String reason = normalizeOptionalText("reason", command.reason(), 1000);
        throwIfInvalid(errors);
        return new NormalizedPublicCreateInput(email, requesterName, reason);
    }

    private NormalizedVerifyInput normalizeVerify(VerifyCommand command) {
        List<FieldError> errors = new ArrayList<>();
        UUID requestId = requireRequestId(command.requestId(), errors);
        String code = normalizeCode(command.code());
        String token = normalizeToken(command.token());
        if ((code == null) == (token == null)) {
            errors.add(new FieldError("__root__", "인증번호 또는 인증 토큰 중 하나만 입력해주세요."));
        }
        if (code != null && code.length() != 6) {
            errors.add(new FieldError("code", "입력값을 확인해 주세요."));
        }
        throwIfInvalid(errors);
        return new NormalizedVerifyInput(requestId, code, token);
    }

    private NormalizedConfirmInput normalizeConfirm(ConfirmCommand command) {
        List<FieldError> errors = new ArrayList<>();
        UUID requestId = requireRequestId(command.requestId(), errors);
        String deletionAuthorization = command.deletionAuthorization() == null ? null : command.deletionAuthorization().trim();
        if (deletionAuthorization == null || deletionAuthorization.length() < 32 || deletionAuthorization.length() > 500) {
            errors.add(new FieldError("deletion_authorization", "입력값을 확인해 주세요."));
        }
        if (!command.confirm()) {
            errors.add(new FieldError("confirm", "입력값을 확인해 주세요."));
        }
        throwIfInvalid(errors);
        return new NormalizedConfirmInput(requestId, deletionAuthorization);
    }

    private UUID requireRequestId(UUID requestId) {
        return requireRequestId(requestId, new ArrayList<>());
    }

    private UUID requireRequestId(UUID requestId, List<FieldError> errors) {
        if (requestId == null) {
            errors.add(new FieldError("request_id", "입력값을 확인해 주세요."));
        }
        throwIfInvalid(errors);
        return requestId;
    }

    private void throwIfInvalid(List<FieldError> errors) {
        if (!errors.isEmpty()) {
            throw new HypofitValidationException("Account deletion validation failed", errors);
        }
    }

    private String normalizeEmail(String value, List<FieldError> errors) {
        if (value == null) {
            errors.add(new FieldError("email", "이메일을 확인해주세요."));
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        int atIndex = normalized.indexOf('@');
        if (atIndex <= 0 || atIndex == normalized.length() - 1 || !normalized.substring(atIndex + 1).contains(".")) {
            errors.add(new FieldError("email", "이메일을 확인해주세요."));
            return null;
        }
        return normalized;
    }

    private String normalizeOptionalText(String field, String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = String.join(" ", value.trim().split("\\s+"));
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() > maxLength) {
            throw new HypofitValidationException(
                    "Account deletion validation failed",
                    List.of(new FieldError(field, "입력값을 확인해 주세요."))
            );
        }
        return normalized;
    }

    private String normalizeCode(String value) {
        if (value == null) {
            return null;
        }
        StringBuilder digits = new StringBuilder();
        for (char character : value.toCharArray()) {
            if (Character.isDigit(character)) {
                digits.append(character);
            }
        }
        String normalized = digits.toString();
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeToken(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private AccountDeletionRequestReadModel toReadModel(AccountDeletionRequestRecord request) {
        return new AccountDeletionRequestReadModel(
                request.id(),
                request.userId(),
                request.email(),
                request.emailHash(),
                request.emailRedactedAt(),
                request.requesterName(),
                request.reason(),
                request.status(),
                request.source(),
                request.result(),
                request.retentionNote(),
                request.retentionUntil(),
                request.authUserDeleteStatus(),
                request.authUserDeletedAt(),
                request.authUserDeleteErrorCode(),
                request.verifiedAt(),
                request.verificationExpiresAt(),
                request.verificationResendAvailableAt(),
                null,
                request.createdAt(),
                request.updatedAt()
        );
    }

    private AccountDeletionRequestMutation toMutation(
            AccountDeletionRequestReadModel request,
            AccountDeletionRequestRecord existing,
            OffsetDateTime updatedAt
    ) {
        return new AccountDeletionRequestMutation(
                request.id(),
                request.userId(),
                request.email(),
                request.emailHash(),
                request.emailRedactedAt(),
                request.requesterName(),
                request.reason(),
                request.status(),
                request.source(),
                existing == null ? null : existing.verificationTokenHash(),
                existing == null ? null : existing.verificationCodeHash(),
                request.verificationExpiresAt(),
                existing == null ? 0 : existing.verificationAttemptCount(),
                request.verificationResendAvailableAt(),
                existing == null ? null : existing.verificationLockedAt(),
                existing == null ? 0 : existing.verificationSendCount(),
                existing == null ? null : existing.verificationWindowStartedAt(),
                existing == null ? null : existing.deletionAuthorizationHash(),
                existing == null ? null : existing.deletionAuthorizationExpiresAt(),
                request.verifiedAt(),
                existing == null ? null : existing.processedBy(),
                existing == null ? null : existing.processedAt(),
                request.result(),
                request.retentionNote(),
                request.retentionUntil(),
                request.authUserDeleteStatus(),
                request.authUserDeletedAt(),
                request.authUserDeleteErrorCode(),
                request.createdAt(),
                updatedAt
        );
    }

    private AccountDeletionRequestReadModel updateRequestResult(UUID requestId, String result, OffsetDateTime updatedAt) {
        AccountDeletionRequestRecord existing = repository.findRequest(requestId)
                .orElseThrow(() -> new IllegalStateException("Account deletion request is missing after save"));
        return repository.saveRequest(new AccountDeletionRequestMutation(
                existing.id(),
                existing.userId(),
                existing.email(),
                existing.emailHash(),
                existing.emailRedactedAt(),
                existing.requesterName(),
                existing.reason(),
                existing.status(),
                existing.source(),
                existing.verificationTokenHash(),
                existing.verificationCodeHash(),
                existing.verificationExpiresAt(),
                existing.verificationAttemptCount(),
                existing.verificationResendAvailableAt(),
                existing.verificationLockedAt(),
                existing.verificationSendCount(),
                existing.verificationWindowStartedAt(),
                existing.deletionAuthorizationHash(),
                existing.deletionAuthorizationExpiresAt(),
                existing.verifiedAt(),
                existing.processedBy(),
                existing.processedAt(),
                result,
                existing.retentionNote(),
                existing.retentionUntil(),
                existing.authUserDeleteStatus(),
                existing.authUserDeletedAt(),
                existing.authUserDeleteErrorCode(),
                existing.createdAt(),
                updatedAt
        ));
    }

    private HypofitException notFound(String detail) {
        return new HypofitException("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), detail);
    }

    private HypofitException conflict(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
    }

    private HypofitException badRequest(String detail) {
        return new HypofitException("request_failed", "요청을 처리하지 못했어요.", HttpStatus.BAD_REQUEST.value(), detail);
    }

    private HypofitException tooManyRequests(String detail) {
        return new HypofitException("request_rate_limited", "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", 429, detail);
    }

    private HypofitException gone(String detail) {
        return new HypofitException("request_expired", "요청이 만료되었어요.", HttpStatus.GONE.value(), detail);
    }

    private record NormalizedPublicCreateInput(
            String email,
            String requesterName,
            String reason
    ) {
    }

    private record NormalizedVerifyInput(
            UUID requestId,
            String code,
            String token
    ) {
    }

    private record NormalizedConfirmInput(
            UUID requestId,
            String deletionAuthorization
    ) {
    }

    private record VerificationSendWindow(
            int sendCount,
            OffsetDateTime windowStartedAt
    ) {
    }

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
}
