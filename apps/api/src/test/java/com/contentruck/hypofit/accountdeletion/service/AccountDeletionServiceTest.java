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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountDeletionServiceTest {

    private static final String VALID_AUTHORIZATION =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Mock
    private AccountDeletionRepository repository;

    @Mock
    private AccountDeletionEmailGateway emailGateway;

    @Mock
    private AccountDeletionAuthCleanupGateway authCleanupGateway;

    @Mock
    private AccountDeletionProfileImagePurgeGateway profileImagePurgeGateway;

    private AccountDeletionService service;

    @BeforeEach
    void setUp() {
        HypofitProperties properties = new HypofitProperties();
        properties.setEnv("test");
        properties.setAccountDeletionHashPepper("pepper");
        AccountDeletionCompletionWriteService completionWriteService = new AccountDeletionCompletionWriteService(repository);
        lenient().when(profileImagePurgeGateway.purgeProfileImage(any())).thenReturn("no_profile_image");
        service = new AccountDeletionService(
                repository,
                emailGateway,
                authCleanupGateway,
                profileImagePurgeGateway,
                completionWriteService,
                new AccountDeletionAdminService(
                        repository,
                        authCleanupGateway,
                        completionWriteService
                ),
                new AccountDeletionVerificationSecurity(properties),
                properties
        );
    }

    @Test
    void createPublicRequestReturnsCooldownStatusWithoutSendingAnotherEmail() {
        AccountDeletionRequestRecord existing = requestRecord(
                UUID.randomUUID(),
                null,
                "user@example.com",
                "requested",
                AccountDeletionService.PUBLIC_SOURCE,
                OffsetDateTime.now(ZoneOffset.UTC).plusSeconds(30)
        );
        when(repository.findLatestPublicRequestByEmailHash(any())).thenReturn(Optional.of(existing));

        AccountDeletionRequestReadModel result = service.createPublicRequest(
                new PublicCreateCommand("USER@example.com", " 세현 ", "테스트")
        );

        assertThat(result.result()).isEqualTo("verification_code_recently_sent");
        verify(emailGateway, never()).sendVerificationCode(any(), any());
    }

    @Test
    void createPublicRequestRecordsRequestedAndEmailStatusAuditEvents() {
        AtomicReference<AccountDeletionRequestRecord> current = new AtomicReference<>();
        when(repository.findLatestPublicRequestByEmailHash(any())).thenReturn(Optional.empty());
        when(repository.findUserByEmail("user@example.com")).thenReturn(Optional.empty());
        when(repository.saveRequest(any())).thenAnswer(invocation -> {
            AccountDeletionRequestMutation mutation = invocation.getArgument(0);
            AccountDeletionRequestRecord record = requestRecord(mutation);
            current.set(record);
            return readModel(record);
        });
        when(repository.findRequest(any())).thenAnswer(invocation -> Optional.ofNullable(current.get()));
        when(emailGateway.sendVerificationCode(eq("user@example.com"), any())).thenReturn("verification_email_sent");

        service.createPublicRequest(new PublicCreateCommand("USER@example.com", " 세현 ", "공개 삭제 요청"));

        verify(repository).recordAuditEvent(
                eq(null),
                eq("public"),
                eq("account_deletion_requested"),
                eq("account_deletion_request"),
                any(),
                eq("공개 삭제 요청"),
                argThat(metadata -> metadata != null
                        && "public_web".equals(metadata.get("source"))
                        && "code_requested".equals(metadata.get("verification_status"))
                        && metadata.containsKey("email_hash"))
        );
        verify(repository).recordAuditEvent(
                eq(null),
                eq("system"),
                eq("account_deletion_verification_code_email_status"),
                eq("account_deletion_request"),
                any(),
                eq(null),
                argThat(metadata -> Map.of(
                        "source", "public_web",
                        "email_status", "verification_email_sent"
                ).equals(metadata))
        );
    }

    @Test
    void createAuthenticatedRequestRecordsRequestedAndEmailStatusAuditEvents() {
        UUID userId = UUID.randomUUID();
        UserAccountRecord user = activeUser(userId, "user@example.com");
        AtomicReference<AccountDeletionRequestRecord> current = new AtomicReference<>();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(user));
        when(repository.findLatestRequestForUser(userId)).thenReturn(Optional.empty());
        when(repository.saveUserDeletion(any())).thenReturn(user);
        when(repository.saveRequest(any())).thenAnswer(invocation -> {
            AccountDeletionRequestMutation mutation = invocation.getArgument(0);
            AccountDeletionRequestRecord record = requestRecord(mutation);
            current.set(record);
            return readModel(record);
        });
        when(repository.findRequest(any())).thenAnswer(invocation -> Optional.ofNullable(current.get()));
        when(emailGateway.sendVerificationCode(eq("user@example.com"), any())).thenReturn("verification_email_sent");

        service.createAuthenticatedRequest(userId, new AuthenticatedCreateCommand("앱에서 삭제 요청"));

        verify(repository).recordAuditEvent(
                eq(userId),
                eq("user"),
                eq("account_deletion_requested"),
                eq("account_deletion_request"),
                any(),
                eq("앱에서 삭제 요청"),
                eq(Map.of(
                        "source", "mobile_app",
                        "verification_status", "code_requested"
                ))
        );
        verify(repository).recordAuditEvent(
                eq(userId),
                eq("system"),
                eq("account_deletion_verification_code_email_status"),
                eq("account_deletion_request"),
                any(),
                eq(null),
                eq(Map.of(
                        "source", "mobile_app",
                        "email_status", "verification_email_sent"
                ))
        );
    }

    @Test
    void verifyPublicRequestLocksRequestOnFifthInvalidAttempt() {
        UUID requestId = UUID.randomUUID();
        AccountDeletionRequestRecord existing = requestRecord(
                requestId,
                null,
                "user@example.com",
                "requested",
                AccountDeletionService.PUBLIC_SOURCE,
                OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(10)
        );
        existing = new AccountDeletionRequestRecord(
                existing.id(),
                existing.userId(),
                existing.email(),
                existing.emailHash(),
                existing.emailRedactedAt(),
                existing.requesterName(),
                existing.reason(),
                existing.status(),
                existing.source(),
                null,
                "expected-hash",
                OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10),
                4,
                existing.verificationResendAvailableAt(),
                null,
                existing.verificationSendCount(),
                existing.verificationWindowStartedAt(),
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
                existing.createdAt(),
                existing.updatedAt()
        );
        when(repository.findRequestForUpdate(requestId)).thenReturn(Optional.of(existing));
        when(repository.saveRequest(any())).thenReturn(readModel(existing));

        assertThatThrownBy(() -> service.verifyPublicRequest(new VerifyCommand(requestId, "123456", null)))
                .isInstanceOf(HypofitException.class)
                .hasMessageContaining("Verification code is invalid");

        ArgumentCaptor<AccountDeletionRequestMutation> mutationCaptor =
                ArgumentCaptor.forClass(AccountDeletionRequestMutation.class);
        verify(repository).saveRequest(mutationCaptor.capture());
        assertThat(mutationCaptor.getValue().verificationAttemptCount()).isEqualTo(5);
        assertThat(mutationCaptor.getValue().verificationLockedAt()).isNotNull();
        verify(repository).recordAuditEvent(
                eq(null),
                eq("public"),
                eq("account_deletion_verification_code_failed"),
                eq("account_deletion_request"),
                eq(requestId),
                eq(null),
                eq(Map.of(
                        "attempt_count", 5,
                        "locked", true,
                        "source", "public_web"
                ))
        );
    }

    @Test
    void verifyAuthenticatedRequestRecordsVerifiedAuditEvent() {
        UUID userId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        String code = "123456";
        UserAccountRecord user = activeUser(userId, "user@example.com");
        AccountDeletionRequestRecord request = new AccountDeletionRequestRecord(
                requestId,
                userId,
                user.email(),
                "email-hash",
                null,
                "사용자",
                "검증 완료",
                "requested",
                AccountDeletionService.AUTHENTICATED_SOURCE,
                null,
                hmacSha256(requestId + ":" + code, "pepper"),
                OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10),
                0,
                null,
                null,
                1,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1),
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
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2)
        );
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(user));
        when(repository.findRequestForUpdate(requestId)).thenReturn(Optional.of(request));
        when(repository.saveRequest(any())).thenAnswer(invocation -> readModel(requestRecord(invocation.getArgument(0))));
        when(repository.saveUserDeletion(any())).thenReturn(user);

        AccountDeletionVerificationReadModel result =
                service.verifyAuthenticatedRequest(userId, new VerifyCommand(requestId, code, null));

        assertThat(result.request().status()).isEqualTo("verified");
        verify(repository).recordAuditEvent(
                eq(userId),
                eq("user"),
                eq("account_deletion_verified"),
                eq("account_deletion_request"),
                eq(requestId),
                eq("검증 완료"),
                eq(Map.of(
                        "source", "mobile_app",
                        "email_hash", "email-hash",
                        "verification_status", "verified",
                        "matched_active_account", true
                ))
        );
    }

    @Test
    void resendAuthenticatedRequestRecordsResentAuditEvent() {
        UUID userId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UserAccountRecord user = activeUser(userId, "user@example.com");
        AccountDeletionRequestRecord request = requestRecord(
                requestId,
                userId,
                user.email(),
                "requested",
                AccountDeletionService.AUTHENTICATED_SOURCE,
                OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(1)
        );
        AtomicReference<AccountDeletionRequestRecord> current = new AtomicReference<>(request);
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(user));
        when(repository.findRequest(requestId)).thenAnswer(invocation -> Optional.ofNullable(current.get()));
        when(repository.saveRequest(any())).thenAnswer(invocation -> {
            AccountDeletionRequestRecord updated = requestRecord(invocation.getArgument(0));
            current.set(updated);
            return readModel(updated);
        });
        when(emailGateway.sendVerificationCode(eq("user@example.com"), any())).thenReturn("verification_email_sent");

        AccountDeletionRequestReadModel result =
                service.resendAuthenticatedRequest(userId, new ResendCommand(requestId));

        assertThat(result.result()).isEqualTo("verification_email_sent");
        verify(repository).recordAuditEvent(
                eq(userId),
                eq("user"),
                eq("account_deletion_verification_code_resent"),
                eq("account_deletion_request"),
                eq(requestId),
                eq(null),
                eq(Map.of("source", "mobile_app"))
        );
    }

    @Test
    void confirmAuthenticatedRequestAnonymizesUserAndMarksRequestCompleted() {
        UUID userId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UserAccountRecord user = activeUser(userId, "user@example.com");
        AccountDeletionRequestRecord request = verifiedRequest(requestId, userId, user.email(), AccountDeletionService.AUTHENTICATED_SOURCE);
        AtomicReference<AccountDeletionRequestRecord> current = new AtomicReference<>(request);

        when(repository.findUserAccount(userId)).thenReturn(Optional.of(user));
        when(repository.findRequest(requestId)).thenAnswer(invocation -> Optional.ofNullable(current.get()));
        when(repository.claimVerifiedRequest(eq(requestId), any())).thenReturn(true);
        when(repository.disablePushDevices(any(), any(), any(), any())).thenReturn(2);
        when(repository.saveUserDeletion(any())).thenReturn(user);
        when(authCleanupGateway.deleteAuthUser(userId)).thenReturn(new AuthCleanupResult("deleted", null));
        when(repository.saveRequest(any())).thenAnswer(invocation -> {
            AccountDeletionRequestMutation mutation = invocation.getArgument(0);
            AccountDeletionRequestRecord saved = requestRecord(mutation);
            current.set(saved);
            return readModel(saved);
        });

        AccountDeletionRequestReadModel result = service.confirmAuthenticatedRequest(
                userId,
                new ConfirmCommand(requestId, VALID_AUTHORIZATION, true)
        );

        // Replace with a valid authorization flow by calling the lower layer once.
        assertThat(result.status()).isEqualTo("completed");
        assertThat(result.authUserDeleteStatus()).isEqualTo("deleted");
        assertThat(result.email()).startsWith("deleted-request+");
    }

    @Test
    void confirmPublicRequestCompletesWithoutMatchingActiveAccount() {
        UUID requestId = UUID.randomUUID();
        AccountDeletionRequestRecord request = new AccountDeletionRequestRecord(
                requestId,
                null,
                "user@example.com",
                "email-hash",
                null,
                null,
                "삭제",
                "verified",
                AccountDeletionService.PUBLIC_SOURCE,
                null,
                null,
                null,
                0,
                null,
                null,
                1,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1),
                sha256(VALID_AUTHORIZATION),
                OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(5),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2)
        );
        AtomicReference<AccountDeletionRequestRecord> current = new AtomicReference<>(request);

        when(repository.findRequest(requestId)).thenAnswer(invocation -> Optional.ofNullable(current.get()));
        when(repository.claimVerifiedRequest(eq(requestId), any())).thenReturn(true);
        when(repository.findUserByEmail("user@example.com")).thenReturn(Optional.empty());
        when(repository.saveRequest(any())).thenAnswer(invocation -> {
            AccountDeletionRequestMutation mutation = invocation.getArgument(0);
            AccountDeletionRequestRecord saved = requestRecord(mutation);
            current.set(saved);
            return readModel(saved);
        });

        AccountDeletionRequestReadModel result = service.confirmPublicRequest(
                new ConfirmCommand(requestId, VALID_AUTHORIZATION, true)
        );

        assertThat(result.status()).isEqualTo("completed");
        assertThat(result.result()).isEqualTo("no_matching_active_account");
        assertThat(result.email()).startsWith("deleted-request+");
        verify(repository).recordAuditEvent(
                eq(null),
                eq("system"),
                eq("account_deletion_completed_without_active_account"),
                eq("account_deletion_request"),
                eq(requestId),
                eq(null),
                eq(Map.of(
                        "source", "public_web",
                        "email_hash", "email-hash"
                ))
        );
    }

    @Test
    void deactivateCurrentUserCompletesLatestOpenRequestAndRecordsAudit() {
        UUID userId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UserAccountRecord user = activeUser(userId, "user@example.com");
        AccountDeletionRequestRecord request = requestRecord(
                requestId,
                userId,
                user.email(),
                "requested",
                AccountDeletionService.PUBLIC_SOURCE,
                OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(5)
        );
        AccountDeletionRequestRecord completed = new AccountDeletionRequestRecord(
                request.id(),
                user.id(),
                "deleted-request+" + request.id() + "@deleted.hypofit.local",
                request.emailHash(),
                OffsetDateTime.now(ZoneOffset.UTC),
                null,
                "즉시 삭제",
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
                user.id(),
                OffsetDateTime.now(ZoneOffset.UTC),
                "account_deleted_and_direct_identifiers_anonymized",
                "retention",
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(365),
                "deleted",
                OffsetDateTime.now(ZoneOffset.UTC),
                null,
                request.createdAt(),
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        AtomicReference<AccountDeletionRequestRecord> current = new AtomicReference<>(request);

        when(repository.findUserAccount(userId)).thenReturn(Optional.of(user));
        when(repository.findLatestRequestForUser(userId)).thenReturn(Optional.of(request));
        when(repository.findRequest(requestId)).thenAnswer(invocation -> Optional.ofNullable(current.get()));
        when(repository.disablePushDevices(eq(userId), any(), eq("account_deleted"), any())).thenReturn(2);
        when(repository.saveUserDeletion(any())).thenReturn(user);
        when(authCleanupGateway.deleteAuthUser(userId)).thenReturn(new AuthCleanupResult("deleted", null));
        when(repository.saveRequest(any())).thenAnswer(invocation -> {
            AccountDeletionRequestRecord saved = requestRecord(invocation.getArgument(0));
            current.set(saved);
            return readModel(saved);
        });

        AccountDeletionRequestReadModel result =
                service.deactivateCurrentUser(userId, new AuthenticatedCreateCommand("즉시 삭제"));

        assertThat(result.status()).isEqualTo("completed");
        assertThat(result.source()).isEqualTo("public_web");
        assertThat(result.email()).startsWith("deleted-request+");
        verify(repository).recordAuditEvent(
                eq(userId),
                eq("system"),
                eq("account_deletion_email_redacted"),
                eq("account_deletion_request"),
                eq(requestId),
                eq(null),
                anyMap()
        );
        verify(repository).recordAuditEvent(
                eq(userId),
                eq("user"),
                eq("account_deletion_completed"),
                eq("user"),
                eq(userId),
                eq("즉시 삭제"),
                anyMap()
        );
        verify(repository).recordAuditEvent(
                eq(userId),
                eq("system"),
                eq("account_deletion_auth_user_deleted"),
                eq("account_deletion_request"),
                eq(requestId),
                eq(null),
                anyMap()
        );
        verify(repository).recordAuditEvent(
                eq(userId),
                eq("system"),
                eq("account_deletion_rejoin_allowed"),
                eq("account_deletion_request"),
                eq(requestId),
                eq(null),
                anyMap()
        );
    }

    @Test
    void deactivateCurrentUserCreatesNewRequestDirectlyAsCompleted() {
        UUID userId = UUID.randomUUID();
        UserAccountRecord user = activeUser(userId, "user@example.com");
        AtomicReference<AccountDeletionRequestRecord> current = new AtomicReference<>();
        List<AccountDeletionRequestMutation> savedMutations = new ArrayList<>();

        when(repository.findUserAccount(userId)).thenReturn(Optional.of(user));
        when(repository.findLatestRequestForUser(userId)).thenReturn(Optional.empty());
        when(repository.findRequest(any())).thenAnswer(invocation -> Optional.ofNullable(current.get()));
        when(repository.saveUserDeletion(any())).thenReturn(user);
        when(repository.saveRequest(any())).thenAnswer(invocation -> {
            AccountDeletionRequestMutation mutation = invocation.getArgument(0);
            savedMutations.add(mutation);
            AccountDeletionRequestRecord saved = requestRecord(mutation);
            current.set(saved);
            return readModel(saved);
        });
        when(authCleanupGateway.deleteAuthUser(userId)).thenReturn(new AuthCleanupResult("deleted", null));

        AccountDeletionRequestReadModel result =
                service.deactivateCurrentUser(userId, new AuthenticatedCreateCommand("즉시 삭제"));

        assertThat(result.status()).isEqualTo("completed");
        assertThat(result.source()).isEqualTo(AccountDeletionService.AUTHENTICATED_SOURCE);
        assertThat(savedMutations).isNotEmpty().allMatch(mutation -> "completed".equals(mutation.status()));
    }

    @Test
    void listAdminRequestsMapsRedactedEmailAndRetryFields() {
        AccountDeletionRequestRecord request = new AccountDeletionRequestRecord(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "deleted-request+abc@deleted.hypofit.local",
                "2f5a9248b1d3c785f7e6d0f3a1c1d902",
                OffsetDateTime.now(ZoneOffset.UTC),
                null,
                "탈퇴",
                "completed",
                AccountDeletionService.PUBLIC_SOURCE,
                null,
                null,
                null,
                0,
                null,
                null,
                1,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(1),
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(1),
                null,
                OffsetDateTime.now(ZoneOffset.UTC),
                "account_deleted_and_direct_identifiers_anonymized",
                "Interview workflow, support, report, and dispute records may be retained with direct profile identifiers removed where possible. Stored profile image reference was cleared, but storage purge needs operator follow-up.",
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(365),
                null,
                null,
                "network_error",
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        when(repository.listRequestsForAdmin("completed", 25)).thenReturn(List.of(request));

        var items = service.listAdminRequests("completed", 25);

        assertThat(items).hasSize(1);
        assertThat(items.getFirst().emailDisplay()).isEqualTo("삭제 후 비공개 · hash 2f5a9248b1d3");
        assertThat(items.getFirst().verificationStatus()).isEqualTo("verified");
        assertThat(items.getFirst().cleanupStatus()).isEqualTo("account_deleted");
        assertThat(items.getFirst().profileImageCleanupStatus()).isEqualTo("delete_failed");
        assertThat(items.getFirst().authCleanupRetryAvailable()).isTrue();
    }

    @Test
    void retryAuthCleanupUpdatesRequestAndReturnsHydratedAdminView() {
        UUID adminId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        AccountDeletionRequestRecord current = new AccountDeletionRequestRecord(
                requestId,
                userId,
                "deleted-request+abc@deleted.hypofit.local",
                "email-hash",
                OffsetDateTime.now(ZoneOffset.UTC),
                null,
                "탈퇴",
                "completed",
                AccountDeletionService.AUTHENTICATED_SOURCE,
                null,
                null,
                null,
                0,
                null,
                null,
                1,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(1),
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(1),
                userId,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(10),
                "account_deleted_and_direct_identifiers_anonymized",
                "retention",
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(365),
                "failed_retryable",
                null,
                "network_error",
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5)
        );
        AccountDeletionRequestRecord updated = new AccountDeletionRequestRecord(
                current.id(),
                current.userId(),
                current.email(),
                current.emailHash(),
                current.emailRedactedAt(),
                current.requesterName(),
                current.reason(),
                current.status(),
                current.source(),
                current.verificationTokenHash(),
                current.verificationCodeHash(),
                current.verificationExpiresAt(),
                current.verificationAttemptCount(),
                current.verificationResendAvailableAt(),
                current.verificationLockedAt(),
                current.verificationSendCount(),
                current.verificationWindowStartedAt(),
                current.deletionAuthorizationHash(),
                current.deletionAuthorizationExpiresAt(),
                current.verifiedAt(),
                current.processedBy(),
                current.processedAt(),
                current.result(),
                current.retentionNote(),
                current.retentionUntil(),
                "deleted",
                OffsetDateTime.now(ZoneOffset.UTC),
                null,
                current.createdAt(),
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        when(repository.findRequest(requestId))
                .thenReturn(Optional.of(current))
                .thenReturn(Optional.of(updated));
        when(authCleanupGateway.deleteAuthUser(userId)).thenReturn(new AuthCleanupResult("deleted", null));
        when(repository.saveRequest(any())).thenReturn(readModel(updated));

        var item = service.retryAuthCleanup(requestId, adminId);

        assertThat(item.id()).isEqualTo(requestId);
        assertThat(item.authUserDeleteStatus()).isEqualTo("deleted");
        assertThat(item.authCleanupRetryAvailable()).isFalse();
        verify(repository).recordAuditEvent(
                eq(adminId),
                eq("operator"),
                eq("account_deletion_auth_user_deleted"),
                eq("account_deletion_request"),
                eq(requestId),
                eq(null),
                anyMap()
        );
        verify(repository).recordAuditEvent(
                eq(adminId),
                eq("operator"),
                eq("account_deletion_rejoin_allowed"),
                eq("account_deletion_request"),
                eq(requestId),
                eq(null),
                anyMap()
        );
    }

    private UserAccountRecord activeUser(UUID userId, String email) {
        return new UserAccountRecord(
                userId,
                email,
                "테스트 사용자",
                null,
                null,
                "respondent",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private AccountDeletionRequestRecord verifiedRequest(UUID requestId, UUID userId, String email, String source) {
        return new AccountDeletionRequestRecord(
                requestId,
                userId,
                email,
                "email-hash",
                null,
                "사용자",
                "삭제",
                "verified",
                source,
                null,
                null,
                null,
                0,
                null,
                null,
                1,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2),
                sha256(VALID_AUTHORIZATION),
                OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(5),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(3),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(3)
        );
    }

    private AccountDeletionRequestRecord requestRecord(
            UUID requestId,
            UUID userId,
            String email,
            String status,
            String source,
            OffsetDateTime resendAvailableAt
    ) {
        return new AccountDeletionRequestRecord(
                requestId,
                userId,
                email,
                "email-hash",
                null,
                "사용자",
                "삭제",
                status,
                source,
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10),
                0,
                resendAvailableAt,
                null,
                1,
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1),
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
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2)
        );
    }

    private AccountDeletionRequestReadModel readModel(AccountDeletionRequestRecord record) {
        return new AccountDeletionRequestReadModel(
                record.id(),
                record.userId(),
                record.email(),
                record.emailHash(),
                record.emailRedactedAt(),
                record.requesterName(),
                record.reason(),
                record.status(),
                record.source(),
                record.result(),
                record.retentionNote(),
                record.retentionUntil(),
                record.authUserDeleteStatus(),
                record.authUserDeletedAt(),
                record.authUserDeleteErrorCode(),
                record.verifiedAt(),
                record.verificationExpiresAt(),
                record.verificationResendAvailableAt(),
                null,
                record.createdAt(),
                record.updatedAt()
        );
    }

    private AccountDeletionRequestRecord requestRecord(AccountDeletionRequestMutation mutation) {
        return new AccountDeletionRequestRecord(
                mutation.id(),
                mutation.userId(),
                mutation.email(),
                mutation.emailHash(),
                mutation.emailRedactedAt(),
                mutation.requesterName(),
                mutation.reason(),
                mutation.status(),
                mutation.source(),
                mutation.verificationTokenHash(),
                mutation.verificationCodeHash(),
                mutation.verificationExpiresAt(),
                mutation.verificationAttemptCount(),
                mutation.verificationResendAvailableAt(),
                mutation.verificationLockedAt(),
                mutation.verificationSendCount(),
                mutation.verificationWindowStartedAt(),
                mutation.deletionAuthorizationHash(),
                mutation.deletionAuthorizationExpiresAt(),
                mutation.verifiedAt(),
                mutation.processedBy(),
                mutation.processedAt(),
                mutation.result(),
                mutation.retentionNote(),
                mutation.retentionUntil(),
                mutation.authUserDeleteStatus(),
                mutation.authUserDeletedAt(),
                mutation.authUserDeleteErrorCode(),
                mutation.createdAt(),
                mutation.updatedAt()
        );
    }

    private static String sha256(String input) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String hmacSha256(String material, String key) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(key.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            return java.util.HexFormat.of().formatHex(mac.doFinal(material.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
