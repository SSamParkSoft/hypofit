package com.contentruck.hypofit.push.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationPreferenceReadModel(
        UUID userId,
        boolean pushEnabled,
        boolean chatPushEnabled,
        boolean applicationPushEnabled,
        boolean sessionPushEnabled,
        boolean supportPushEnabled,
        boolean marketingPushEnabled,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
