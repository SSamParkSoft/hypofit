package com.contentruck.hypofit.push.application;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.notification.application.NotificationOutboxPublisher;
import com.contentruck.hypofit.notification.domain.NotificationReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class PushOutboxPublisher implements NotificationOutboxPublisher {

    private static final Set<String> PUSH_ELIGIBLE_TYPES = Set.of(
            "chat_message",
            "application_created",
            "application_selected",
            "application_rejected",
            "attendance_confirmation_requested",
            "session_rescheduled",
            "session_canceled",
            "session_completed",
            "reward_marked_paid",
            "reward_confirmed",
            "reward_disputed",
            "review_received",
            "no_show_marked",
            "support_replied"
    );

    private final PushOutboxRepository repository;
    private final HypofitProperties properties;

    public PushOutboxPublisher(
            PushOutboxRepository repository,
            HypofitProperties properties
    ) {
        this.repository = repository;
        this.properties = properties;
    }

    @Override
    public void enqueueForNotification(NotificationReadModel notification) {
        if (!properties.getPush().isEnabled()) {
            return;
        }
        if (!PUSH_ELIGIBLE_TYPES.contains(notification.type())) {
            return;
        }
        repository.enqueueDeliveries(
                notification,
                OffsetDateTime.now(ZoneOffset.UTC),
                properties.getPush().isPushApnsEnabled(),
                properties.getPush().isPushFcmEnabled()
        );
    }
}
