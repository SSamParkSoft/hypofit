package com.contentruck.hypofit.admin.dto;

import com.contentruck.hypofit.admin.service.AdminModerationService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public final class AdminModerationWebModels {

    private AdminModerationWebModels() {
    }

    public record ModerationActionResponse(
            UUID id,
            @JsonProperty("actor_user_id") UUID actorUserId,
            @JsonProperty("target_type") String targetType,
            @JsonProperty("target_id") UUID targetId,
            String action,
            String reason,
            @JsonProperty("source_ticket_id") UUID sourceTicketId,
            Map<String, Object> metadata,
            @JsonProperty("created_at") OffsetDateTime createdAt
    ) {
        public static ModerationActionResponse from(AdminModerationService.ModerationActionView view) {
            return new ModerationActionResponse(
                    view.id(),
                    view.actorUserId(),
                    view.targetType(),
                    view.targetId(),
                    view.action(),
                    view.reason(),
                    view.sourceTicketId(),
                    view.metadata(),
                    view.createdAt()
            );
        }
    }
}
