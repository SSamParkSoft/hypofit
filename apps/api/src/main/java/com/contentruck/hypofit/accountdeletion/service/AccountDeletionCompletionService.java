package com.contentruck.hypofit.accountdeletion.service;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionAuthCleanupGateway.AuthCleanupResult;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.AccountDeletionRequestRecord;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository.UserAccountRecord;
import com.contentruck.hypofit.common.error.HypofitException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
class AccountDeletionCompletionService {

    private final AccountDeletionRepository repository;
    private final AccountDeletionAuthCleanupGateway authCleanupGateway;
    private final AccountDeletionProfileImagePurgeGateway profileImagePurgeGateway;
    private final AccountDeletionCompletionWriteService completionWriteService;
    private final AccountDeletionVerificationSecurity verificationSecurity;

    AccountDeletionCompletionService(
            AccountDeletionRepository repository,
            AccountDeletionAuthCleanupGateway authCleanupGateway,
            AccountDeletionProfileImagePurgeGateway profileImagePurgeGateway,
            AccountDeletionCompletionWriteService completionWriteService,
            AccountDeletionVerificationSecurity verificationSecurity
    ) {
        this.repository = repository;
        this.authCleanupGateway = authCleanupGateway;
        this.profileImagePurgeGateway = profileImagePurgeGateway;
        this.completionWriteService = completionWriteService;
        this.verificationSecurity = verificationSecurity;
    }

    // Why: external cleanup runs between the existing independent write-service commits.
    // Do not wrap the whole completion flow in a database transaction.
    AccountDeletionRequestReadModel confirmVerifiedDeletion(
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
                    .map(AccountDeletionRequestReadModel::from)
                    .orElseThrow(() -> new IllegalStateException("Account deletion request is missing after completion"));
        }
        return performCompletedDeletion(activeMatchedUser, request, request.reason(), actorType);
    }

    AccountDeletionRequestReadModel performCompletedDeletion(
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
                profileImagePurgeStatus,
                "system"
        );
        AuthCleanupResult authCleanup = authCleanupGateway.deleteAuthUser(user.id());
        completionWriteService.persistCompletionAuthCleanupResult(initialState.requestId(), initialState.userId(), authCleanup);
        return repository.findRequest(initialState.requestId())
                .map(AccountDeletionRequestReadModel::from)
                .orElseThrow(() -> new IllegalStateException("Account deletion request is missing after completion"));
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

    private HypofitException conflict(String detail) {
        return new HypofitException("conflict", "이미 처리된 요청이에요.", HttpStatus.CONFLICT.value(), detail);
    }

    private HypofitException badRequest(String detail) {
        return new HypofitException("request_failed", "요청을 처리하지 못했어요.", HttpStatus.BAD_REQUEST.value(), detail);
    }

    private HypofitException gone(String detail) {
        return new HypofitException("request_expired", "요청이 만료되었어요.", HttpStatus.GONE.value(), detail);
    }
}
