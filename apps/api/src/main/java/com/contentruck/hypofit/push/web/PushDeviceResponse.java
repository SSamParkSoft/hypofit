package com.contentruck.hypofit.push.web;

import com.contentruck.hypofit.push.domain.PushDeviceReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PushDeviceResponse(
        UUID id,
        String platform,
        String provider,
        String environment,
        @JsonProperty("installation_id")
        String installationId,
        @JsonProperty("device_label")
        String deviceLabel,
        @JsonProperty("app_version")
        String appVersion,
        @JsonProperty("build_number")
        String buildNumber,
        @JsonProperty("os_version")
        String osVersion,
        String locale,
        String timezone,
        @JsonProperty("permission_status")
        String permissionStatus,
        boolean enabled,
        @JsonProperty("last_registered_at")
        OffsetDateTime lastRegisteredAt,
        @JsonProperty("last_success_at")
        OffsetDateTime lastSuccessAt,
        @JsonProperty("last_failure_at")
        OffsetDateTime lastFailureAt,
        @JsonProperty("disabled_at")
        OffsetDateTime disabledAt,
        @JsonProperty("disabled_reason")
        String disabledReason,
        @JsonProperty("created_at")
        OffsetDateTime createdAt,
        @JsonProperty("updated_at")
        OffsetDateTime updatedAt
) {
    public static PushDeviceResponse from(PushDeviceReadModel model) {
        return new PushDeviceResponse(
                model.id(),
                model.platform(),
                model.provider(),
                model.environment(),
                model.installationId(),
                model.deviceLabel(),
                model.appVersion(),
                model.buildNumber(),
                model.osVersion(),
                model.locale(),
                model.timezone(),
                model.permissionStatus(),
                model.enabled(),
                model.lastRegisteredAt(),
                model.lastSuccessAt(),
                model.lastFailureAt(),
                model.disabledAt(),
                model.disabledReason(),
                model.createdAt(),
                model.updatedAt()
        );
    }
}
