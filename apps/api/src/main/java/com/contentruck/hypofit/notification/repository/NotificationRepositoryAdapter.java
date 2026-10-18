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
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;

@Repository
public class NotificationRepositoryAdapter implements NotificationRepository {

    private final NotificationJpaRepository notificationJpaRepository;
    private final NotificationUserJpaRepository notificationUserJpaRepository;
    private final NamedParameterJdbcTemplate jdbc;

    public NotificationRepositoryAdapter(
            NotificationJpaRepository notificationJpaRepository,
            NotificationUserJpaRepository notificationUserJpaRepository,
            NamedParameterJdbcTemplate jdbc
    ) {
        this.notificationJpaRepository = notificationJpaRepository;
        this.notificationUserJpaRepository = notificationUserJpaRepository;
        this.jdbc = jdbc;
    }

    @Override
    public boolean isSharingRestricted(UUID userId, String targetType, UUID targetId) {
        if (targetId == null || targetType == null) return false;
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                select exists(select 1 from applications a
                join interview_posts p on p.id = a.interview_post_id
                where a.sharing_withdrawn_at is not null and p.founder_id = :userId
                  and ((:targetType = 'application' and a.id = :targetId)
                    or (:targetType = 'chat_room' and exists(select 1 from chat_rooms r
                        where r.application_id = a.id and r.id = :targetId))
                    or (:targetType in ('session', 'interview_session') and exists(select 1 from interview_sessions s
                        where s.application_id = a.id and s.id = :targetId))))
                """, new MapSqlParameterSource("userId", userId).addValue("targetType", targetType)
                .addValue("targetId", targetId), Boolean.class));
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
