package com.contentruck.hypofit.push.service;

import com.contentruck.hypofit.notification.service.NotificationReadModel;
import java.time.OffsetDateTime;

public interface PushOutboxRepository {

    int enqueueDeliveries(
            NotificationReadModel notification,
            OffsetDateTime now,
            boolean apnsEnabled,
            boolean fcmEnabled
    );
}
