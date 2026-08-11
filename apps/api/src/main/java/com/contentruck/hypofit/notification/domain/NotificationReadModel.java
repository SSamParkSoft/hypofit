package com.contentruck.hypofit.notification.domain;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record NotificationReadModel(
        UUID id,
        UUID userId,
        String type,
        String title,
        String body,
        String targetType,
        UUID targetId,
        Map<String, Object> metadata,
        OffsetDateTime readAt,
        OffsetDateTime createdAt
) {
}
