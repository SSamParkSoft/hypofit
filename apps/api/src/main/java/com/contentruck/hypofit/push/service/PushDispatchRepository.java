package com.contentruck.hypofit.push.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface PushDispatchRepository {

    int resetStaleSendingDeliveries(OffsetDateTime now, int timeoutSeconds, int maxAttempts);

    PushOutboxSnapshot snapshotPendingDeliveries(OffsetDateTime now);

    List<ClaimedPushDeliveryRecord> claimPendingDeliveries(OffsetDateTime now, int limit);

    void markDeliverySent(
            OffsetDateTime now,
            UUID deliveryId,
            UUID pushDeviceId,
            String providerMessageId,
            String providerStatus
    );

    void markDeliveryFailed(
            OffsetDateTime now,
            UUID deliveryId,
            UUID pushDeviceId,
            int attemptCount,
            String providerStatus,
            String errorCode,
            String errorMessage,
            int maxAttempts
    );

    void markDeliveryInvalid(
            OffsetDateTime now,
            UUID deliveryId,
            UUID pushDeviceId,
            String providerStatus,
            String errorCode,
            String errorMessage
    );

    void markDeliverySkipped(
            OffsetDateTime now,
            UUID deliveryId,
            String providerStatus,
            String errorCode,
            String errorMessage
    );

    record ClaimedPushDeliveryRecord(
            UUID deliveryId,
            int attemptCount,
            PushDeviceDispatchRecord device,
            NotificationDispatchRecord notification
    ) {
    }

    record PushOutboxSnapshot(long pendingCount, long oldestPendingAgeSeconds) {
    }

    record PushDeviceDispatchRecord(
            UUID id,
            String provider,
            String environment,
            String token,
            String tokenHash
    ) {
    }

    record NotificationDispatchRecord(
            UUID id,
            UUID userId,
            String type,
            String title,
            String body,
            String targetType,
            UUID targetId,
            Map<String, Object> metadata
    ) {
    }
}
