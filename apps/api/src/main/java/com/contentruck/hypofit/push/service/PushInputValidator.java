package com.contentruck.hypofit.push.service;

import com.contentruck.hypofit.push.service.PushCommands.RegisterPushDeviceCommand;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

final class PushInputValidator {

    private static final Set<String> PLATFORMS = Set.of("ios", "android");
    private static final Set<String> PROVIDERS = Set.of("apns", "fcm");
    private static final Set<String> ENVIRONMENTS = Set.of("development", "production");
    private static final Set<String> PERMISSION_STATUSES = Set.of("granted", "denied", "provisional", "unknown");

    private PushInputValidator() {
    }

    static RegisterPushDeviceCommand validateRegister(RegisterPushDeviceCommand command) {
        List<FieldError> issues = new ArrayList<>();
        String platform = requireEnum(command.platform(), "platform", "platform must be ios or android", PLATFORMS, issues);
        String provider = requireEnum(command.provider(), "provider", "provider must be apns or fcm", PROVIDERS, issues);
        String environment = requireEnum(
                command.environment(),
                "environment",
                "environment must be development or production",
                ENVIRONMENTS,
                issues
        );
        String token = requireLength(command.token(), "token", 10, 4096, issues);
        String installationId = validateMaxLength(command.installationId(), "installation_id", 120, issues);
        String deviceLabel = validateMaxLength(command.deviceLabel(), "device_label", 120, issues);
        String appVersion = validateMaxLength(command.appVersion(), "app_version", 40, issues);
        String buildNumber = validateMaxLength(command.buildNumber(), "build_number", 40, issues);
        String osVersion = validateMaxLength(command.osVersion(), "os_version", 80, issues);
        String locale = validateMaxLength(command.locale(), "locale", 40, issues);
        String timezone = validateMaxLength(command.timezone(), "timezone", 80, issues);
        String permissionStatus = requireEnum(
                command.permissionStatus(),
                "permission_status",
                "permission_status must be granted, denied, provisional, or unknown",
                PERMISSION_STATUSES,
                issues
        );

        if (!issues.isEmpty()) {
            throw new HypofitValidationException("Push validation failed", issues);
        }

        return new RegisterPushDeviceCommand(
                platform,
                provider,
                environment,
                token,
                installationId,
                deviceLabel,
                appVersion,
                buildNumber,
                osVersion,
                locale,
                timezone,
                permissionStatus
        );
    }

    private static String requireEnum(
            String value,
            String field,
            String message,
            Set<String> allowed,
            List<FieldError> issues
    ) {
        if (value == null || !allowed.contains(value)) {
            issues.add(new FieldError(field, message));
        }
        return value;
    }

    private static String requireLength(
            String value,
            String field,
            int min,
            int max,
            List<FieldError> issues
    ) {
        if (value == null) {
            issues.add(new FieldError(field, "must not be null"));
            return null;
        }
        if (value.length() < min) {
            issues.add(new FieldError(field, "size must be between " + min + " and " + max));
        } else if (value.length() > max) {
            issues.add(new FieldError(field, "size must be between " + min + " and " + max));
        }
        return value;
    }

    private static String validateMaxLength(String value, String field, int max, List<FieldError> issues) {
        if (value != null && value.length() > max) {
            issues.add(new FieldError(field, "size must be between 0 and " + max));
        }
        return value;
    }

}
