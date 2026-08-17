package com.contentruck.hypofit.admin.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(hidden = true)
public record AdminSupportTicketReplyCreateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public AdminSupportTicketReplyCreateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "AdminSupportTicketReplyCreate")
    public record OpenApiSchema(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 2, maxLength = 2000)
            String body,
            @JsonProperty("visible_to_user")
            @Schema(defaultValue = "true")
            Boolean visibleToUser
    ) {
    }
}
