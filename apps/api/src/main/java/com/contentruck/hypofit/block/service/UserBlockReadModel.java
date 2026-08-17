package com.contentruck.hypofit.block.service;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserBlockReadModel(
        UUID id,
        UUID blockerId,
        UUID blockedUserId,
        String reason,
        String source,
        OffsetDateTime createdAt,
        OffsetDateTime revokedAt,
        BlockedUserSummary blockedUser
) {
}
