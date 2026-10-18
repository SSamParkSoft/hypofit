package com.contentruck.hypofit.accountdeletion.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "hypofit.account-deletion", name = "cleanup-retry-enabled", havingValue = "true")
public class AccountDeletionCleanupRetryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AccountDeletionCleanupRetryService.class);
    private final AccountDeletionRepository repository;
    private final AccountDeletionCompletionWriteService writeService;
    private final AccountDeletionAuthCleanupGateway authCleanupGateway;
    private final AccountDeletionProfileImagePurgeGateway profileImagePurgeGateway;

    public AccountDeletionCleanupRetryService(
            AccountDeletionRepository repository,
            AccountDeletionCompletionWriteService writeService,
            AccountDeletionAuthCleanupGateway authCleanupGateway,
            AccountDeletionProfileImagePurgeGateway profileImagePurgeGateway
    ) {
        this.repository = repository;
        this.writeService = writeService;
        this.authCleanupGateway = authCleanupGateway;
        this.profileImagePurgeGateway = profileImagePurgeGateway;
    }

    @Scheduled(fixedDelay = 900_000, initialDelay = 900_000)
    public void retryCleanup() {
        OffsetDateTime before = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(15);
        for (UUID requestId : repository.findCleanupRetryCandidates(before, 20)) {
            try {
                // Commit the claim before provider I/O; a crash becomes eligible again after 15 minutes.
                if (!writeService.claimCleanupRetry(requestId, before)) {
                    continue;
                }
                String path = repository.findPendingProfileImagePath(requestId).orElse(null);
                if (path != null) {
                    String result = profileImagePurgeGateway.purgeProfileImage(path);
                    writeService.persistProfileImagePurgeResult(requestId, null, path, "pending_profile_image_purge", result);
                }
                var request = repository.findRequest(requestId).orElseThrow();
                String authStatus = request.authUserDeleteStatus();
                if ("pending".equals(authStatus) || "failed_retryable".equals(authStatus)
                        || "skipped_missing_config".equals(authStatus)) {
                    var result = authCleanupGateway.deleteAuthUser(request.userId());
                    writeService.persistCompletionAuthCleanupResult(requestId, null, result);
                }
            } catch (RuntimeException exception) {
                // Provider/DB exception messages can contain personal data or credentials.
                LOGGER.warn("Account deletion external cleanup retry failed ({})", exception.getClass().getSimpleName());
            }
        }
    }
}
