package com.contentruck.hypofit.notification.controller;

import com.contentruck.hypofit.notification.dto.NotificationResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.notification.service.NotificationService;
import com.contentruck.hypofit.notification.service.NotificationReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class NotificationsControllerTest {

    @Mock
    private NotificationService notificationService;

    @Test
    void listNotificationsUsesJwtSubjectAndQueryParameters() {
        UUID userId = UUID.randomUUID();
        when(notificationService.listNotifications(userId, true, 10)).thenReturn(List.of(notification(userId)));

        NotificationsController controller = new NotificationsController(notificationService);
        List<NotificationResponse> response = controller.listNotifications(jwt(userId), true, 10);

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().userId()).isEqualTo(userId);
        verify(notificationService).listNotifications(userId, true, 10);
    }

    @Test
    void markNotificationReadUsesJwtSubjectAndPathVariable() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        when(notificationService.markNotificationRead(userId, notificationId)).thenReturn(notification(userId, notificationId));

        NotificationsController controller = new NotificationsController(notificationService);
        NotificationResponse response = controller.markNotificationRead(jwt(userId), notificationId);

        assertThat(response.id()).isEqualTo(notificationId);
        verify(notificationService).markNotificationRead(userId, notificationId);
    }

    @Test
    void markAllNotificationsReadUsesJwtSubject() {
        UUID userId = UUID.randomUUID();

        NotificationsController controller = new NotificationsController(notificationService);
        controller.markAllNotificationsRead(jwt(userId));

        verify(notificationService).markAllNotificationsRead(userId);
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }

    private NotificationReadModel notification(UUID userId) {
        return notification(userId, UUID.randomUUID());
    }

    private NotificationReadModel notification(UUID userId, UUID notificationId) {
        return new NotificationReadModel(
                notificationId,
                userId,
                "application_selected",
                "알림 제목",
                "알림 본문",
                "application",
                UUID.randomUUID(),
                Map.of("application_id", UUID.randomUUID().toString()),
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }
}
