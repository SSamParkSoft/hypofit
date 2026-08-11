package com.contentruck.hypofit.block.web;

import com.fasterxml.jackson.annotation.JsonCreator;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(hidden = true)
public record UserBlockCreateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public UserBlockCreateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "UserBlockCreate")
    public record OpenApiSchema(
            @Schema(nullable = true, maxLength = 500)
            String reason
    ) {
    }
}
