package com.contentruck.hypofit.notification.application;

import com.contentruck.hypofit.notification.domain.NotificationReadModel;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository {

    NotificationReadModel createNotification(
            UUID userId,
            String type,
            String title,
            String body,
            String targetType,
            UUID targetId,
            java.util.Map<String, Object> metadata,
            OffsetDateTime createdAt
    );

    Optional<CurrentUserAccountRecord> findCurrentUserAccount(UUID userId);

    List<NotificationReadModel> listNotifications(UUID userId, boolean unreadOnly, int limit);

    Optional<NotificationReadModel> markNotificationRead(UUID notificationId, UUID userId, OffsetDateTime readAt);

    void markAllNotificationsRead(UUID userId, OffsetDateTime readAt);

    record CurrentUserAccountRecord(
            UUID id,
            OffsetDateTime deactivatedAt,
            OffsetDateTime deletedAt
    ) {
    }
}
