package com.contentruck.hypofit.admin.web;

import com.contentruck.hypofit.admin.application.AdminModerationService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

final class AdminModerationWebModels {

    private AdminModerationWebModels() {
    }

    record ModerationActionResponse(
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
        static ModerationActionResponse from(AdminModerationService.ModerationActionView view) {
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
