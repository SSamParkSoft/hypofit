package com.contentruck.hypofit.interview.web;

import com.fasterxml.jackson.annotation.JsonCreator;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(hidden = true)
public record InterviewPostStatusUpdateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public InterviewPostStatusUpdateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "InterviewPostStatusUpdate")
    public record OpenApiSchema(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"closed"})
            String status
    ) {
    }
}
