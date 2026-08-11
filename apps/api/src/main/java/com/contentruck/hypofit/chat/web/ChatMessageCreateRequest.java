package com.contentruck.hypofit.chat.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageCreateRequest(
        @Schema(minLength = 1, maxLength = 2000)
        @NotBlank(message = "Message body is required")
        @Size(max = 2000)
        String body,
        @JsonProperty("client_message_id")
        @Schema(maxLength = 80, nullable = true)
        @Size(max = 80)
        String clientMessageId
) {
}
