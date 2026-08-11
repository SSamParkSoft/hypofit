package com.contentruck.hypofit.support.web;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(hidden = true)
public record SupportTicketUpdateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public SupportTicketUpdateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "SupportTicketUpdate")
    public record OpenApiSchema(
            @Schema(
                    types = {"null", "string"},
                    allowableValues = {"account", "interview_post", "application", "chat", "reward", "privacy", "abuse", "no_show", "other"}
            )
            String category,
            @Schema(types = {"null", "string"}, maxLength = 140)
            String subject,
            @Schema(types = {"null", "string"}, minLength = 5, maxLength = 2000)
            String body,
            @JsonProperty("contact_email")
            @Schema(types = {"null", "string"}, minLength = 5, maxLength = 320)
            String contactEmail
    ) {
    }
}
