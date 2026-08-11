package com.contentruck.hypofit.notification.application;

import com.contentruck.hypofit.notification.domain.NotificationReadModel;

public interface NotificationOutboxPublisher {

    void enqueueForNotification(NotificationReadModel notification);
}
