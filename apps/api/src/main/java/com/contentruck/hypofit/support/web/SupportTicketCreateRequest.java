package com.contentruck.hypofit.support.web;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;
import java.util.UUID;

@Schema(hidden = true)
public record SupportTicketCreateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public SupportTicketCreateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "SupportTicketCreate")
    public record OpenApiSchema(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"inquiry", "report", "privacy", "account_deletion"})
            String kind,
            @Schema(
                    requiredMode = Schema.RequiredMode.REQUIRED,
                    allowableValues = {"account", "interview_post", "application", "chat", "reward", "privacy", "abuse", "no_show", "other"}
            )
            String category,
            @Schema(types = {"null", "string"}, maxLength = 140)
            String subject,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 5, maxLength = 2000)
            String body,
            @JsonProperty("contact_email")
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 5, maxLength = 320)
            String contactEmail,
            @JsonProperty("target_type")
            @Schema(types = {"null", "string"}, allowableValues = {"interview_post", "application", "chat_room", "chat_message", "user", "session"})
            String targetType,
            @JsonProperty("target_id")
            @Schema(types = {"null", "string"}, format = "uuid")
            UUID targetId,
            @Schema(additionalProperties = Schema.AdditionalPropertiesValue.TRUE)
            Map<String, Object> metadata
    ) {
    }
}
