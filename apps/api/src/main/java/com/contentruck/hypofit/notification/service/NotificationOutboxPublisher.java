package com.contentruck.hypofit.notification.service;


public interface NotificationOutboxPublisher {

    void enqueueForNotification(NotificationReadModel notification);
}
