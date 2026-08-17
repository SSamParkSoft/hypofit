package com.contentruck.hypofit.chat.service;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatRoomSettingsModel(
        UUID roomId,
        UUID userId,
        boolean isMuted,
        boolean isHidden,
        OffsetDateTime lastReadAt
) {
}
