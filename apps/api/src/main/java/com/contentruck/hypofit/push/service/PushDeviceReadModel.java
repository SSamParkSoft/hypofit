package com.contentruck.hypofit.push.service;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PushDeviceReadModel(
        UUID id,
        String platform,
        String provider,
        String environment,
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
        OffsetDateTime disabledAt,
        String disabledReason,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
