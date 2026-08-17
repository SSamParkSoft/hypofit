package com.contentruck.hypofit.admin.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(hidden = true)
public record AdminSupportTicketStatusUpdateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public AdminSupportTicketStatusUpdateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "AdminSupportTicketStatusUpdate")
    public record OpenApiSchema(
            @Schema(
                    requiredMode = Schema.RequiredMode.REQUIRED,
                    allowableValues = {"open", "in_review", "resolved", "closed"}
            )
            String status,
            @Schema(nullable = true, maxLength = 1000)
            String reason
    ) {
    }
}
