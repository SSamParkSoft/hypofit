package com.contentruck.hypofit.push.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.notification.service.NotificationReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PushOutboxPublisherTest {

    @Mock
    private PushOutboxRepository repository;

    private HypofitProperties properties;
    private PushOutboxPublisher publisher;

    @BeforeEach
    void setUp() {
        properties = new HypofitProperties();
        publisher = new PushOutboxPublisher(repository, properties);
    }

    @Test
    void enqueueForNotificationNoOpsWhenPushIsDisabled() {
        properties.getPush().setEnabled(false);

        publisher.enqueueForNotification(notification("chat_message"));

        verify(repository, never()).enqueueDeliveries(any(), any(), eq(false), eq(false));
    }

    @Test
    void enqueueForNotificationNoOpsForUnsupportedType() {
        properties.getPush().setEnabled(true);
        properties.getPush().setPushApnsEnabled(true);
        properties.getPush().setPushFcmEnabled(true);

        publisher.enqueueForNotification(notification("marketing_broadcast"));

        verify(repository, never()).enqueueDeliveries(any(), any(), any(Boolean.class), any(Boolean.class));
    }

    @Test
    void enqueueForNotificationDelegatesEligibleTypeWithProviderFlags() {
        properties.getPush().setEnabled(true);
        properties.getPush().setPushApnsEnabled(true);
        properties.getPush().setPushFcmEnabled(false);
        NotificationReadModel notification = notification("chat_message");

        publisher.enqueueForNotification(notification);

        ArgumentCaptor<OffsetDateTime> nowCaptor = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(repository).enqueueDeliveries(eq(notification), nowCaptor.capture(), eq(true), eq(false));
        assertThat(nowCaptor.getValue()).isNotNull();
    }

    private NotificationReadModel notification(String type) {
        return new NotificationReadModel(
                UUID.randomUUID(),
                UUID.randomUUID(),
                type,
                "알림",
                "본문",
                "chat_room",
                UUID.randomUUID(),
                Map.of(),
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }
}
