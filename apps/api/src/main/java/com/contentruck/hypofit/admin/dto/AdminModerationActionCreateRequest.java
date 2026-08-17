package com.contentruck.hypofit.admin.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;
import java.util.UUID;

@Schema(hidden = true)
public record AdminModerationActionCreateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public AdminModerationActionCreateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "ModerationActionCreate")
    public record OpenApiSchema(
            @JsonProperty("target_type")
            @Schema(
                    requiredMode = Schema.RequiredMode.REQUIRED,
                    allowableValues = {"user", "interview_post", "application", "chat_room", "chat_message", "session"}
            )
            String targetType,
            @JsonProperty("target_id")
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "uuid")
            UUID targetId,
            @Schema(
                    requiredMode = Schema.RequiredMode.REQUIRED,
                    allowableValues = {"warn", "hide", "remove", "block", "unblock", "close_report", "restore"}
            )
            String action,
            @Schema(nullable = true, maxLength = 1000)
            String reason,
            @JsonProperty("source_ticket_id")
            @Schema(nullable = true, format = "uuid")
            UUID sourceTicketId,
            Map<String, Object> metadata
    ) {
    }
}
