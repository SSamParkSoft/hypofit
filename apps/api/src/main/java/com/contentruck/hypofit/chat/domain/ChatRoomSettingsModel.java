package com.contentruck.hypofit.chat.domain;

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
