package com.contentruck.hypofit.socialauth.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(hidden = true)
@JsonIgnoreProperties(ignoreUnknown = false)
public record AppleSignInNotificationReceive(
        @NotBlank(message = "must not be blank")
        String payload
) {
    @Schema(name = "AppleSignInNotificationReceive", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record OpenApiSchema(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 1)
            String payload
    ) {
    }
}
