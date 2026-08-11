package com.contentruck.hypofit.admin.web;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(hidden = true)
public record AdminTestNotificationCreateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public AdminTestNotificationCreateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "AdminTestNotificationCreate")
    public record OpenApiSchema(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 5, maxLength = 320)
            String email,
            @Schema(
                    requiredMode = Schema.RequiredMode.REQUIRED,
                    allowableValues = {
                            "chat_message",
                            "application_created",
                            "application_selected",
                            "application_rejected",
                            "session_rescheduled",
                            "session_canceled",
                            "no_show_marked",
                            "support_replied"
                    }
            )
            String type,
            @JsonProperty("target_type")
            @Schema(
                    nullable = true,
                    allowableValues = {"application", "chat_room", "interview_post", "interview_session", "support_ticket"}
            )
            String targetType,
            @JsonProperty("target_id")
            @Schema(nullable = true, format = "uuid")
            UUID targetId,
            @Schema(defaultValue = "false")
            Boolean dispatch
    ) {
    }
}
