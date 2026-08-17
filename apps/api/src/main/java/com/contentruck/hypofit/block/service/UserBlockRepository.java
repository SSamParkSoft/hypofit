package com.contentruck.hypofit.block.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface UserBlockRepository {

    Optional<BlockActorAccount> findUserAccount(UUID userId);

    Optional<BlockedUserSummary> findUserSummary(UUID userId);

    UserBlockReadModel createOrReactivateBlock(UUID blockerId, UUID blockedUserId, String reason);

    Optional<UserBlockReadModel> revokeBlock(UUID blockerId, UUID blockedUserId);

    List<UserBlockReadModel> listActiveBlocks(UUID blockerId);

    void recordAuditEvent(
            UUID actorUserId,
            String actorType,
            String eventType,
            String targetType,
            UUID targetId,
            String reason,
            Map<String, Object> metadata
    );
}
