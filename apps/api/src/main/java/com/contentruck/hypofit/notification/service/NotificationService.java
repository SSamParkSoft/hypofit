package com.contentruck.hypofit.notification.service;


import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationReadModel> listNotifications(UUID userId, boolean unreadOnly, int limit) {
        requireActiveUser(userId);
        return notificationRepository.listNotifications(userId, unreadOnly, limit);
    }

    @Transactional
    public NotificationReadModel markNotificationRead(UUID userId, UUID notificationId) {
        requireActiveUser(userId);
        return notificationRepository.markNotificationRead(
                        notificationId,
                        userId,
                        OffsetDateTime.now(ZoneOffset.UTC)
                )
                .orElseThrow(NotificationNotFoundException::new);
    }

    @Transactional
    public void markAllNotificationsRead(UUID userId) {
        requireActiveUser(userId);
        notificationRepository.markAllNotificationsRead(userId, OffsetDateTime.now(ZoneOffset.UTC));
    }

    private void requireActiveUser(UUID userId) {
        NotificationRepository.CurrentUserAccountRecord user = notificationRepository.findCurrentUserAccount(userId)
                .orElseThrow(NotificationProfileMissingException::new);
        if (user.deletedAt() != null) {
            throw new NotificationAccountDeletedException();
        }
        if (user.deactivatedAt() != null) {
            throw new NotificationAccountDeactivatedException();
        }
    }
}
