package com.contentruck.hypofit.notification.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationRepositoryAdapterTest {

    @Mock
    private NotificationJpaRepository notificationJpaRepository;

    @Mock
    private NotificationUserJpaRepository notificationUserJpaRepository;

    @Test
    void markNotificationReadPreservesExistingReadTimestamp() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        OffsetDateTime existingReadAt = OffsetDateTime.parse("2026-07-30T12:00:00Z");
        NotificationEntity entity = entity(userId, notificationId, existingReadAt);
        when(notificationJpaRepository.findByIdAndUserId(notificationId, userId)).thenReturn(Optional.of(entity));
        when(notificationJpaRepository.saveAndFlush(entity)).thenReturn(entity);

        NotificationRepositoryAdapter adapter = new NotificationRepositoryAdapter(
                notificationJpaRepository,
                notificationUserJpaRepository
        );

        OffsetDateTime attemptedReadAt = OffsetDateTime.now(ZoneOffset.UTC);
        var result = adapter.markNotificationRead(notificationId, userId, attemptedReadAt);

        assertThat(result).isPresent();
        assertThat(result.get().readAt()).isEqualTo(existingReadAt);
        verify(notificationJpaRepository).saveAndFlush(entity);
    }

    private NotificationEntity entity(UUID userId, UUID notificationId, OffsetDateTime readAt) {
        NotificationEntity entity = new NotificationEntity();
        entity.setId(notificationId);
        entity.setUserId(userId);
        entity.setType("application_selected");
        entity.setTitle("알림");
        entity.setBody("본문");
        entity.setTargetType("application");
        entity.setTargetId(UUID.randomUUID());
        entity.setMetadata(new LinkedHashMap<>());
        entity.setReadAt(readAt);
        entity.setCreatedAt(OffsetDateTime.parse("2026-07-31T00:00:00Z"));
        return entity;
    }
}
