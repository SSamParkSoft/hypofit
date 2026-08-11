package com.contentruck.hypofit.chat.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(name = "ChatRoomReadUpdate")
public record ChatRoomReadUpdateRequest(
        @JsonProperty("last_read_message_id")
        @Schema(format = "uuid", nullable = true)
        UUID lastReadMessageId
) {
}
