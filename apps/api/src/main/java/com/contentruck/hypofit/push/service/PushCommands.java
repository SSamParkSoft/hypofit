package com.contentruck.hypofit.push.service;

public final class PushCommands {

    private PushCommands() {
    }

    public record RegisterPushDeviceCommand(
            String platform,
            String provider,
            String environment,
            String token,
            String installationId,
            String deviceLabel,
            String appVersion,
            String buildNumber,
            String osVersion,
            String locale,
            String timezone,
            String permissionStatus
    ) {
    }

    public record UpdateNotificationPreferenceCommand(
            boolean pushEnabledPresent,
            Boolean pushEnabled,
            boolean chatPushEnabledPresent,
            Boolean chatPushEnabled,
            boolean applicationPushEnabledPresent,
            Boolean applicationPushEnabled,
            boolean sessionPushEnabledPresent,
            Boolean sessionPushEnabled,
            boolean supportPushEnabledPresent,
            Boolean supportPushEnabled,
            boolean marketingPushEnabledPresent,
            Boolean marketingPushEnabled
    ) {
    }
}
