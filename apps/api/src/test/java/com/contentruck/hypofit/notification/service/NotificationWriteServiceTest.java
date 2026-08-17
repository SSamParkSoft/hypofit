package com.contentruck.hypofit.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationWriteServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationOutboxPublisher notificationOutboxPublisher;

    @Captor
    private ArgumentCaptor<Map<String, Object>> metadataCaptor;

    private NotificationWriteService service;

    @BeforeEach
    void setUp() {
        service = new NotificationWriteService(notificationRepository, notificationOutboxPublisher);
    }

    @Test
    void createNotificationPersistsAndEnqueuesReturnedNotification() {
        UUID userId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        NotificationReadModel persisted = notification(userId, targetId, Map.of("application_id", "app-1"));
        when(notificationRepository.createNotification(
                eq(userId),
                eq("application_selected"),
                eq("지원자가 선정되었어요"),
                eq("채팅에서 일정을 조율해 보세요."),
                eq("application"),
                eq(targetId),
                any(),
                any()
        )).thenReturn(persisted);

        Map<String, Object> metadata = Map.of("application_id", "app-1");

        NotificationReadModel result = service.createNotification(
                userId,
                "application_selected",
                "지원자가 선정되었어요",
                "채팅에서 일정을 조율해 보세요.",
                "application",
                targetId,
                metadata
        );

        ArgumentCaptor<OffsetDateTime> createdAtCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(notificationRepository).createNotification(
                eq(userId),
                eq("application_selected"),
                eq("지원자가 선정되었어요"),
                eq("채팅에서 일정을 조율해 보세요."),
                eq("application"),
                eq(targetId),
                metadataCaptor.capture(),
                createdAtCaptor.capture()
        );
        verify(notificationOutboxPublisher).enqueueForNotification(persisted);

        assertThat(result).isSameAs(persisted);
        assertThat(metadataCaptor.getValue()).containsExactlyEntriesOf(metadata);
        assertThat(createdAtCaptor.getValue()).isNotNull();
    }

    @Test
    void createNotificationNormalizesNullMetadataToEmptyMap() {
        UUID userId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        NotificationReadModel persisted = notification(userId, targetId, Map.of());
        when(notificationRepository.createNotification(
                eq(userId),
                eq("support_replied"),
                eq("답변이 도착했어요"),
                eq("문의 내용을 확인해 보세요."),
                eq("support_ticket"),
                eq(targetId),
                any(),
                any()
        )).thenReturn(persisted);

        service.createNotification(
                userId,
                "support_replied",
                "답변이 도착했어요",
                "문의 내용을 확인해 보세요.",
                "support_ticket",
                targetId,
                null
        );

        verify(notificationRepository).createNotification(
                eq(userId),
                eq("support_replied"),
                eq("답변이 도착했어요"),
                eq("문의 내용을 확인해 보세요."),
                eq("support_ticket"),
                eq(targetId),
                metadataCaptor.capture(),
                any()
        );
        verify(notificationOutboxPublisher).enqueueForNotification(persisted);

        assertThat(metadataCaptor.getValue()).isEmpty();
    }

    private NotificationReadModel notification(UUID userId, UUID targetId, Map<String, Object> metadata) {
        return new NotificationReadModel(
                UUID.randomUUID(),
                userId,
                "application_selected",
                "알림",
                "본문",
                "application",
                targetId,
                metadata,
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }
}
