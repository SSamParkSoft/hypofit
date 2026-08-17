package com.contentruck.hypofit.block.service;

import com.contentruck.hypofit.user.service.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserBlockService {

    private final UserBlockRepository repository;

    public UserBlockService(UserBlockRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<UserBlockReadModel> listBlockedUsers(UUID blockerId) {
        requireActiveUser(blockerId);
        return repository.listActiveBlocks(blockerId);
    }

    @Transactional
    public UserBlockReadModel blockUser(UUID blockerId, UUID blockedUserId, UserBlockCommand command) {
        requireActiveUser(blockerId);
        if (blockerId.equals(blockedUserId)) {
            throw new BlockBadRequestException("Cannot block yourself");
        }

        BlockedUserSummary blockedUser = repository.findUserSummary(blockedUserId)
                .orElseThrow(() -> new BlockNotFoundException("User not found"));

        UserBlockReadModel block = repository.createOrReactivateBlock(blockerId, blockedUserId, command.reason());
        repository.recordAuditEvent(
                blockerId,
                "user",
                "user_blocked",
                "user",
                blockedUserId,
                command.reason(),
                Map.of("user_block_id", block.id().toString())
        );
        return new UserBlockReadModel(
                block.id(),
                block.blockerId(),
                block.blockedUserId(),
                block.reason(),
                block.source(),
                block.createdAt(),
                block.revokedAt(),
                blockedUser
        );
    }

    @Transactional
    public void unblockUser(UUID blockerId, UUID blockedUserId) {
        requireActiveUser(blockerId);
        UserBlockReadModel block = repository.revokeBlock(blockerId, blockedUserId)
                .orElseThrow(() -> new BlockNotFoundException("Block not found"));
        repository.recordAuditEvent(
                blockerId,
                "user",
                "user_unblocked",
                "user",
                blockedUserId,
                null,
                Map.of("user_block_id", block.id().toString())
        );
    }

    private void requireActiveUser(UUID userId) {
        BlockActorAccount account = repository.findUserAccount(userId)
                .orElseThrow(UserProfileMissingException::new);
        if (account.deleted()) {
            throw new UserAccountDeletedException();
        }
        if (account.deactivated()) {
            throw new UserAccountDeactivatedException();
        }
    }
}
