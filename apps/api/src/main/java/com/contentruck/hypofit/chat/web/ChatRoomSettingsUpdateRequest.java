package com.contentruck.hypofit.chat.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

public record ChatRoomSettingsUpdateRequest(
        @JsonProperty("is_muted")
        @Schema(nullable = true)
        Boolean isMuted,
        @JsonProperty("is_hidden")
        @Schema(nullable = true)
        Boolean isHidden
) {
}
