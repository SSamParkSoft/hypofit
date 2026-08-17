package com.contentruck.hypofit.chat.service;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record ChatMessageReadModel(
        UUID id,
        UUID roomId,
        UUID senderId,
        String messageType,
        String body,
        String clientMessageId,
        Map<String, Object> metadata,
        OffsetDateTime hiddenAt,
        String hiddenReason,
        OffsetDateTime createdAt
) {
}
