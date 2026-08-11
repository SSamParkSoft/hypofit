package com.contentruck.hypofit.block.web;

import com.contentruck.hypofit.block.domain.UserBlockReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserBlockResponse(
        UUID id,
        @JsonProperty("blocker_id") UUID blockerId,
        @JsonProperty("blocked_user_id") UUID blockedUserId,
        String reason,
        String source,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("revoked_at") OffsetDateTime revokedAt,
        @JsonProperty("blocked_user") BlockedUserSummaryResponse blockedUser
) {

    public static UserBlockResponse from(UserBlockReadModel model) {
        return new UserBlockResponse(
                model.id(),
                model.blockerId(),
                model.blockedUserId(),
                model.reason(),
                model.source(),
                model.createdAt(),
                model.revokedAt(),
                BlockedUserSummaryResponse.from(model.blockedUser())
        );
    }
}
