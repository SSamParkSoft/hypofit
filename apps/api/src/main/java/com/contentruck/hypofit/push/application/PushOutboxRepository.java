package com.contentruck.hypofit.push.application;

import com.contentruck.hypofit.notification.domain.NotificationReadModel;
import java.time.OffsetDateTime;

public interface PushOutboxRepository {

    int enqueueDeliveries(
            NotificationReadModel notification,
            OffsetDateTime now,
            boolean apnsEnabled,
            boolean fcmEnabled
    );
}
