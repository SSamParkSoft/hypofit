package com.contentruck.hypofit.accountdeletion.service;

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
    private static final int VERIFICATION_MAX_SENDS_PER_HOUR = 5;
    private static final Duration VERIFICATION_SEND_WINDOW = Duration.ofHours(1);

    private final AccountDeletionRepository repository;
    private final AccountDeletionEmailGateway emailGateway;
    private final AccountDeletionVerificationSecurity verificationSecurity;
    private final AccountDeletionVerificationService verificationService;
    private final AccountDeletionCompletionService completionService;
    private final HypofitProperties properties;

    public AccountDeletionService(
            AccountDeletionRepository repository,
            AccountDeletionEmailGateway emailGateway,
            AccountDeletionVerificationSecurity verificationSecurity,
            AccountDeletionVerificationService verificationService,
            AccountDeletionCompletionService completionService,
            HypofitProperties properties
    ) {
        this.repository = repository;
        this.emailGateway = emailGateway;
        this.verificationSecurity = verificationSecurity;
        this.verificationService = verificationService;
        this.completionService = completionService;
        this.properties = properties;
    }

    @Transactional
    public AccountDeletionRequestReadModel createPublicRequest(PublicCreateCommand command) {
        NormalizedPublicCreateInput input = normalizePublicCreate(command);
        OffsetDateTime now = now();
        String emailHash = verificationSecurity.hashEmail(input.email());
        AccountDeletionRequestRecord existing = repository.findLatestPublicRequestByEmailHash(emailHash).orElse(null);

        if (isVerificationRecentlySent(existing, now)) {
            return AccountDeletionRequestReadModel.from(existing).withResult("verification_code_recently_sent");
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

    public AccountDeletionVerificationReadModel verifyPublicRequest(VerifyCommand command) {
        NormalizedVerifyInput input = normalizeVerify(command);
        return verificationService.verifyPublic(input.requestId(), input.code(), input.token()).requireVerified();
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
        return completionService.confirmVerifiedDeletion(request, input.deletionAuthorization(), null, "public");
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
            return AccountDeletionRequestReadModel.from(existing).withResult("verification_code_recently_sent");
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

    public AccountDeletionVerificationReadModel verifyAuthenticatedRequest(UUID userId, VerifyCommand command) {
        NormalizedVerifyInput input = normalizeVerify(command);
        return verificationService.verifyAuthenticated(userId, input.requestId(), input.code(), input.token()).requireVerified();
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
        return completionService.confirmVerifiedDeletion(request, input.deletionAuthorization(), user, "user");
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
        return completionService.performCompletedDeletion(user, request, reason, "user");
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

    private HypofitException tooManyRequests(String detail) {
        return new HypofitException("request_rate_limited", "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", 429, detail);
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

}
