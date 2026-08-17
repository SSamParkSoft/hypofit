package com.contentruck.hypofit.chat.dto;

import com.contentruck.hypofit.chat.service.ChatRoomSettingsModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatRoomSettingsResponse(
        @JsonProperty("room_id")
        UUID roomId,
        @JsonProperty("user_id")
        UUID userId,
        @JsonProperty("is_muted")
        boolean isMuted,
        @JsonProperty("is_hidden")
        boolean isHidden,
        @JsonProperty("last_read_at")
        OffsetDateTime lastReadAt
) {
    public static ChatRoomSettingsResponse from(ChatRoomSettingsModel model) {
        return new ChatRoomSettingsResponse(
                model.roomId(),
                model.userId(),
                model.isMuted(),
                model.isHidden(),
                model.lastReadAt()
        );
    }
}
