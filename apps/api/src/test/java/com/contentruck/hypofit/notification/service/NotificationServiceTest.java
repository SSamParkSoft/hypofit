package com.contentruck.hypofit.notification.service;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository);
    }

    @Test
    void listNotificationsRequiresActiveUserAndReturnsRepositoryData() {
        UUID userId = UUID.randomUUID();
        when(notificationRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(notificationRepository.listNotifications(userId, true, 20)).thenReturn(List.of(notification(userId)));

        List<NotificationReadModel> notifications = notificationService.listNotifications(userId, true, 20);

        assertThat(notifications).hasSize(1);
        assertThat(notifications.getFirst().title()).isEqualTo("새 지원이 도착했어요");
    }

    @Test
    void listNotificationsRejectsMissingDeletedAndDeactivatedUser() {
        UUID userId = UUID.randomUUID();
        when(notificationRepository.findCurrentUserAccount(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.listNotifications(userId, false, 50))
                .isInstanceOf(NotificationProfileMissingException.class);

        when(notificationRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(
                new NotificationRepository.CurrentUserAccountRecord(
                        userId,
                        null,
                        OffsetDateTime.now(ZoneOffset.UTC)
                )
        ));
        assertThatThrownBy(() -> notificationService.listNotifications(userId, false, 50))
                .isInstanceOf(NotificationAccountDeletedException.class);

        when(notificationRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(
                new NotificationRepository.CurrentUserAccountRecord(
                        userId,
                        OffsetDateTime.now(ZoneOffset.UTC),
                        null
                )
        ));
        assertThatThrownBy(() -> notificationService.listNotifications(userId, false, 50))
                .isInstanceOf(NotificationAccountDeactivatedException.class);
    }

    @Test
    void markNotificationReadReturnsOwnedNotification() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        when(notificationRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(notificationRepository.markNotificationRead(
                org.mockito.ArgumentMatchers.eq(notificationId),
                org.mockito.ArgumentMatchers.eq(userId),
                org.mockito.ArgumentMatchers.any()
        ))
                .thenAnswer(invocation -> Optional.of(notification(
                        userId,
                        notificationId,
                        invocation.getArgument(2)
                )));

        NotificationReadModel read = notificationService.markNotificationRead(userId, notificationId);

        assertThat(read.id()).isEqualTo(notificationId);
        assertThat(read.readAt()).isNotNull();
    }

    @Test
    void markNotificationReadReturnsNotFoundForMissingOrForeignNotification() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        when(notificationRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(notificationRepository.markNotificationRead(
                org.mockito.ArgumentMatchers.eq(notificationId),
                org.mockito.ArgumentMatchers.eq(userId),
                org.mockito.ArgumentMatchers.any()
        ))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markNotificationRead(userId, notificationId))
                .isInstanceOf(NotificationNotFoundException.class);
    }

    @Test
    void markAllNotificationsReadRequiresActiveUserAndPassesTimestamp() {
        UUID userId = UUID.randomUUID();
        when(notificationRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));

        notificationService.markAllNotificationsRead(userId);

        ArgumentCaptor<OffsetDateTime> captor = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(notificationRepository).markAllNotificationsRead(org.mockito.ArgumentMatchers.eq(userId), captor.capture());
        assertThat(captor.getValue()).isNotNull();
    }

    @Test
    void markAllNotificationsReadDoesNotWriteForMissingUser() {
        UUID userId = UUID.randomUUID();
        when(notificationRepository.findCurrentUserAccount(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAllNotificationsRead(userId))
                .isInstanceOf(NotificationProfileMissingException.class);
        verify(notificationRepository, never()).markAllNotificationsRead(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    private NotificationRepository.CurrentUserAccountRecord activeUser(UUID userId) {
        return new NotificationRepository.CurrentUserAccountRecord(userId, null, null);
    }

    private NotificationReadModel notification(UUID userId) {
        return notification(userId, UUID.randomUUID(), null);
    }

    private NotificationReadModel notification(UUID userId, UUID notificationId, OffsetDateTime readAt) {
        return new NotificationReadModel(
                notificationId,
                userId,
                "application_selected",
                "새 지원이 도착했어요",
                "지원자를 확인해 보세요.",
                "application",
                UUID.randomUUID(),
                Map.of("application_id", UUID.randomUUID().toString()),
                readAt,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }
}
