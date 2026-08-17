package com.contentruck.hypofit.notification.repository;

import com.contentruck.hypofit.notification.entity.NotificationEntity;
import com.contentruck.hypofit.notification.service.NotificationRepository;
import com.contentruck.hypofit.notification.service.NotificationReadModel;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepositoryAdapter implements NotificationRepository {

    private final NotificationJpaRepository notificationJpaRepository;
    private final NotificationUserJpaRepository notificationUserJpaRepository;

    public NotificationRepositoryAdapter(
            NotificationJpaRepository notificationJpaRepository,
            NotificationUserJpaRepository notificationUserJpaRepository
    ) {
        this.notificationJpaRepository = notificationJpaRepository;
        this.notificationUserJpaRepository = notificationUserJpaRepository;
    }

    @Override
    public NotificationReadModel createNotification(
            UUID userId,
            String type,
            String title,
            String body,
            String targetType,
            UUID targetId,
            Map<String, Object> metadata,
            OffsetDateTime createdAt
    ) {
        NotificationEntity entity = new NotificationEntity();
        entity.setId(UUID.randomUUID());
        entity.setUserId(userId);
        entity.setType(type);
        entity.setTitle(title);
        entity.setBody(body);
        entity.setTargetType(targetType);
        entity.setTargetId(targetId);
        entity.setMetadata(metadata == null ? Map.of() : new LinkedHashMap<>(metadata));
        entity.setReadAt(null);
        entity.setCreatedAt(createdAt);
        return toModel(notificationJpaRepository.saveAndFlush(entity));
    }

    @Override
    public Optional<CurrentUserAccountRecord> findCurrentUserAccount(UUID userId) {
        return notificationUserJpaRepository.findById(userId)
                .map(entity -> new CurrentUserAccountRecord(
                        entity.getId(),
                        entity.getDeactivatedAt(),
                        entity.getDeletedAt()
                ));
    }

    @Override
    public List<NotificationReadModel> listNotifications(UUID userId, boolean unreadOnly, int limit) {
        PageRequest page = PageRequest.of(0, limit);
        List<NotificationEntity> entities = unreadOnly
                ? notificationJpaRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(userId, page)
                : notificationJpaRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId, page);
        return entities.stream().map(this::toModel).toList();
    }

    @Override
    public Optional<NotificationReadModel> markNotificationRead(UUID notificationId, UUID userId, OffsetDateTime readAt) {
        Optional<NotificationEntity> entity = notificationJpaRepository.findByIdAndUserId(notificationId, userId);
        if (entity.isEmpty()) {
            return Optional.empty();
        }

        NotificationEntity notification = entity.get();
        notification.setReadAt(notification.getReadAt() == null ? readAt : notification.getReadAt());
        NotificationEntity saved = notificationJpaRepository.saveAndFlush(notification);
        return Optional.of(toModel(saved));
    }

    @Override
    public void markAllNotificationsRead(UUID userId, OffsetDateTime readAt) {
        notificationJpaRepository.markAllUnreadRead(userId, readAt);
    }

    private NotificationReadModel toModel(NotificationEntity entity) {
        Map<String, Object> metadata = entity.getMetadata() == null
                ? Map.of()
                : new LinkedHashMap<>(entity.getMetadata());
        return new NotificationReadModel(
                entity.getId(),
                entity.getUserId(),
                entity.getType(),
                entity.getTitle(),
                entity.getBody(),
                entity.getTargetType(),
                entity.getTargetId(),
                metadata,
                entity.getReadAt(),
                entity.getCreatedAt()
        );
    }
}
