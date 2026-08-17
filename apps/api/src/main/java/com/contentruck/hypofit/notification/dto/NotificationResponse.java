package com.contentruck.hypofit.notification.dto;

import com.contentruck.hypofit.notification.service.NotificationReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        @JsonProperty("user_id")
        UUID userId,
        String type,
        String title,
        String body,
        @JsonProperty("target_type")
        String targetType,
        @JsonProperty("target_id")
        UUID targetId,
        Map<String, Object> metadata,
        @JsonProperty("read_at")
        OffsetDateTime readAt,
        @JsonProperty("created_at")
        OffsetDateTime createdAt
) {
    public static NotificationResponse from(NotificationReadModel model) {
        return new NotificationResponse(
                model.id(),
                model.userId(),
                model.type(),
                model.title(),
                model.body(),
                model.targetType(),
                model.targetId(),
                model.metadata(),
                model.readAt(),
                model.createdAt()
        );
    }
}
