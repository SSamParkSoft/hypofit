package com.contentruck.hypofit.accountdeletion.service;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionAuthCleanupGateway.AuthCleanupResult;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.AccountDeletionRequestRecord;
import com.contentruck.hypofit.common.error.HypofitException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AccountDeletionAdminService {

    private static final Set<String> AUTH_USER_DELETE_RETRYABLE_STATUSES =
            Set.of("pending", "failed_retryable", "skipped_missing_config");

    private final AccountDeletionRepository repository;
    private final AccountDeletionAuthCleanupGateway authCleanupGateway;
    private final AccountDeletionCompletionWriteService completionWriteService;

    AccountDeletionAdminService(
            AccountDeletionRepository repository,
            AccountDeletionAuthCleanupGateway authCleanupGateway,
            AccountDeletionCompletionWriteService completionWriteService
    ) {
        this.repository = repository;
        this.authCleanupGateway = authCleanupGateway;
        this.completionWriteService = completionWriteService;
    }

    @Transactional(readOnly = true)
    List<AccountDeletionService.AdminAccountDeletionRequestView> listRequests(String status, int limit) {
        return repository.listRequestsForAdmin(status, limit).stream()
                .map(this::toView)
                .toList();
    }

    AccountDeletionService.AdminAccountDeletionRequestView retryAuthCleanup(UUID requestId, UUID actorUserId) {
        AccountDeletionRequestRecord request = repository.findRequest(requestId)
                .orElseThrow(() -> notFound("Account deletion request not found"));
        if (!canRetryAuthCleanup(request)) {
            throw conflict("Auth cleanup retry is not available for this request");
        }

        AuthCleanupResult authCleanup = authCleanupGateway.deleteAuthUser(request.userId());
        completionWriteService.persistRetryAuthCleanupResult(request.id(), actorUserId, authCleanup);
        return repository.findRequest(requestId)
                .map(this::toView)
                .orElseThrow(() -> new IllegalStateException("Account deletion request is missing after retry"));
    }

    private AccountDeletionService.AdminAccountDeletionRequestView toView(AccountDeletionRequestRecord request) {
        return new AccountDeletionService.AdminAccountDeletionRequestView(
                request.id(), request.userId(), request.requesterName(), emailDisplay(request),
                emailHashPrefix(request.emailHash()), request.emailRedactedAt(), request.reason(), request.status(),
                request.source(), verificationStatus(request), cleanupStatus(request), request.result(),
                AccountDeletionCleanupPolicy.inferProfileImagePurgeStatus(request.retentionNote()),
                request.authUserDeleteStatus(), request.authUserDeletedAt(), request.authUserDeleteErrorCode(),
                canRetryAuthCleanup(request), request.retentionNote(), request.retentionUntil(), request.verifiedAt(),
                request.processedBy(), request.processedAt(), request.createdAt(), request.updatedAt()
        );
    }

    private boolean canRetryAuthCleanup(AccountDeletionRequestRecord request) {
        return request.userId() != null
                && "completed".equals(request.status())
                && (request.authUserDeleteStatus() == null
                || AUTH_USER_DELETE_RETRYABLE_STATUSES.contains(request.authUserDeleteStatus()));
    }

    private String verificationStatus(AccountDeletionRequestRecord request) {
        if (!AccountDeletionService.PUBLIC_SOURCE.equals(request.source())) return "not_required";
        if (request.verifiedAt() != null) return "verified";
        if (isClosed(request)) return "closed_without_verification";
        return "awaiting_verification";
    }

    private String cleanupStatus(AccountDeletionRequestRecord request) {
        if ("requested".equals(request.status()) || "verified".equals(request.status()) || "in_review".equals(request.status())) return "pending";
        if ("rejected".equals(request.status()) || "canceled".equals(request.status())) return request.status();
        if ("account_deleted_and_direct_identifiers_anonymized".equals(request.result())) return "account_deleted";
        if ("no_matching_active_account".equals(request.result())) return "no_matching_active_account";
        return "completed".equals(request.status()) ? "completed" : request.status();
    }

    private boolean isClosed(AccountDeletionRequestRecord request) {
        return "completed".equals(request.status()) || "rejected".equals(request.status()) || "canceled".equals(request.status());
    }

    private String emailDisplay(AccountDeletionRequestRecord request) {
        if (request.emailRedactedAt() == null) return request.email();
        String hashPrefix = emailHashPrefix(request.emailHash());
        return hashPrefix == null ? "삭제 후 비공개" : "삭제 후 비공개 · hash " + hashPrefix;
    }

    private String emailHashPrefix(String emailHash) {
        return emailHash == null || emailHash.isBlank() ? null : emailHash.substring(0, Math.min(12, emailHash.length()));
    }

    private HypofitException notFound(String detail) {
        return new HypofitException("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), detail);
    }

    private HypofitException conflict(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
    }
}
