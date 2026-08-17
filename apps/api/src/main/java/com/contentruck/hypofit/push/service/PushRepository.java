package com.contentruck.hypofit.push.service;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PushRepository {

    Optional<UserAccountRecord> findUserAccount(UUID userId);

    Optional<PushDeviceRecord> findPushDevice(String provider, String environment, String tokenHash);

    Optional<PushDeviceRecord> findUserPushDevice(UUID pushDeviceId, UUID userId);

    PushDeviceReadModel savePushDevice(PushDeviceMutation mutation);

    NotificationPreferenceRecord getOrCreatePreferences(UUID userId, OffsetDateTime now);

    NotificationPreferenceReadModel savePreferences(NotificationPreferenceMutation mutation);

    record UserAccountRecord(
            UUID id,
            OffsetDateTime deactivatedAt,
            OffsetDateTime deletedAt
    ) {
    }

    record PushDeviceRecord(
            UUID id,
            UUID userId,
            String platform,
            String provider,
            String environment,
            String token,
            String tokenHash,
            String installationId,
            String deviceLabel,
            String appVersion,
            String buildNumber,
            String osVersion,
            String locale,
            String timezone,
            String permissionStatus,
            boolean enabled,
            OffsetDateTime lastRegisteredAt,
            OffsetDateTime lastSuccessAt,
            OffsetDateTime lastFailureAt,
            int failureCount,
            OffsetDateTime disabledAt,
            String disabledReason,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    record PushDeviceMutation(
            UUID id,
            UUID userId,
            String platform,
            String provider,
            String environment,
            String token,
            String tokenHash,
            String installationId,
            String deviceLabel,
            String appVersion,
            String buildNumber,
            String osVersion,
            String locale,
            String timezone,
            String permissionStatus,
            boolean enabled,
            OffsetDateTime lastRegisteredAt,
            OffsetDateTime lastSuccessAt,
            OffsetDateTime lastFailureAt,
            int failureCount,
            OffsetDateTime disabledAt,
            String disabledReason,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    record NotificationPreferenceRecord(
            UUID userId,
            boolean pushEnabled,
            boolean chatPushEnabled,
            boolean applicationPushEnabled,
            boolean sessionPushEnabled,
            boolean supportPushEnabled,
            boolean marketingPushEnabled,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    record NotificationPreferenceMutation(
            UUID userId,
            boolean pushEnabled,
            boolean chatPushEnabled,
            boolean applicationPushEnabled,
            boolean sessionPushEnabled,
            boolean supportPushEnabled,
            boolean marketingPushEnabled,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }
}
