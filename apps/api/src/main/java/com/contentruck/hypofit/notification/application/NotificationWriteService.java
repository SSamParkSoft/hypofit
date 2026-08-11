package com.contentruck.hypofit.notification.application;

import com.contentruck.hypofit.notification.domain.NotificationReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationWriteService {

    private final NotificationRepository notificationRepository;
    private final NotificationOutboxPublisher notificationOutboxPublisher;

    public NotificationWriteService(
            NotificationRepository notificationRepository,
            NotificationOutboxPublisher notificationOutboxPublisher
    ) {
        this.notificationRepository = notificationRepository;
        this.notificationOutboxPublisher = notificationOutboxPublisher;
    }

    @Transactional
    public NotificationReadModel createNotification(
            UUID userId,
            String type,
            String title,
            String body,
            String targetType,
            UUID targetId,
            Map<String, Object> metadata
    ) {
        NotificationReadModel notification = notificationRepository.createNotification(
                userId,
                type,
                title,
                body,
                targetType,
                targetId,
                metadata == null ? Map.of() : Map.copyOf(metadata),
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        notificationOutboxPublisher.enqueueForNotification(notification);
        return notification;
    }
}
