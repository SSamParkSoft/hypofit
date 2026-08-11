package com.contentruck.hypofit.push.web;

import com.contentruck.hypofit.push.domain.NotificationPreferenceReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationPreferenceResponse(
        @JsonProperty("user_id")
        UUID userId,
        @JsonProperty("push_enabled")
        boolean pushEnabled,
        @JsonProperty("chat_push_enabled")
        boolean chatPushEnabled,
        @JsonProperty("application_push_enabled")
        boolean applicationPushEnabled,
        @JsonProperty("session_push_enabled")
        boolean sessionPushEnabled,
        @JsonProperty("support_push_enabled")
        boolean supportPushEnabled,
        @JsonProperty("marketing_push_enabled")
        boolean marketingPushEnabled,
        @JsonProperty("created_at")
        OffsetDateTime createdAt,
        @JsonProperty("updated_at")
        OffsetDateTime updatedAt
) {
    public static NotificationPreferenceResponse from(NotificationPreferenceReadModel model) {
        return new NotificationPreferenceResponse(
                model.userId(),
                model.pushEnabled(),
                model.chatPushEnabled(),
                model.applicationPushEnabled(),
                model.sessionPushEnabled(),
                model.supportPushEnabled(),
                model.marketingPushEnabled(),
                model.createdAt(),
                model.updatedAt()
        );
    }
}
