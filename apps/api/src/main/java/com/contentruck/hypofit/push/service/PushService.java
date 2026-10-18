package com.contentruck.hypofit.push.service;

import com.contentruck.hypofit.push.service.PushCommands.RegisterPushDeviceCommand;
import com.contentruck.hypofit.push.service.PushCommands.UpdateNotificationPreferenceCommand;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PushService {

    private final PushRepository pushRepository;
    private final PushDispatchRepository dispatchRepository;

    public PushService(PushRepository pushRepository, PushDispatchRepository dispatchRepository) {
        this.pushRepository = pushRepository;
        this.dispatchRepository = dispatchRepository;
    }

    @Transactional
    public PushDeviceReadModel registerPushDevice(UUID userId, RegisterPushDeviceCommand rawCommand) {
        // Serialize device writes with account deletion before checking account or device state.
        requireActiveUser(pushRepository.findUserAccountForUpdate(userId)
                .orElseThrow(PushProfileRequiredException::new));
        RegisterPushDeviceCommand command = PushInputValidator.validateRegister(rawCommand);

        if (!defaultProviderForPlatform(command.platform()).equals(command.provider())) {
            throw new PushTokenInvalidException();
        }
        if (!command.permissionStatus().equals("granted") && !command.permissionStatus().equals("provisional")) {
            throw new PushPermissionDeniedException();
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String tokenHash = hashToken(command.token());
        PushRepository.PushDeviceRecord existing = pushRepository.findPushDevice(
                command.provider(),
                command.environment(),
                tokenHash
        ).orElse(null);

        PushDeviceReadModel device = pushRepository.savePushDevice(new PushRepository.PushDeviceMutation(
                existing == null ? null : existing.id(),
                userId,
                command.platform(),
                command.provider(),
                command.environment(),
                command.token(),
                tokenHash,
                command.installationId(),
                command.deviceLabel(),
                command.appVersion(),
                command.buildNumber(),
                command.osVersion(),
                command.locale(),
                command.timezone(),
                command.permissionStatus(),
                true,
                now,
                existing == null ? null : existing.lastSuccessAt(),
                existing == null ? null : existing.lastFailureAt(),
                existing == null ? 0 : existing.failureCount(),
                null,
                null,
                existing == null ? now : existing.createdAt(),
                now
        ));

        pushRepository.getOrCreatePreferences(userId, now);
        return device;
    }

    @Transactional
    public void disablePushDevice(UUID userId, UUID pushDeviceId) {
        requireActiveUser(pushRepository.findUserAccountForUpdate(userId)
                .orElseThrow(PushNotificationProfileMissingException::new));
        PushRepository.PushDeviceRecord device = pushRepository.findUserPushDevice(pushDeviceId, userId)
                .orElseThrow(PushDeviceNotFoundException::new);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        pushRepository.savePushDevice(new PushRepository.PushDeviceMutation(
                device.id(),
                device.userId(),
                device.platform(),
                device.provider(),
                device.environment(),
                device.token(),
                device.tokenHash(),
                device.installationId(),
                device.deviceLabel(),
                device.appVersion(),
                device.buildNumber(),
                device.osVersion(),
                device.locale(),
                device.timezone(),
                device.permissionStatus(),
                false,
                device.lastRegisteredAt(),
                device.lastSuccessAt(),
                device.lastFailureAt(),
                device.failureCount(),
                now,
                "user_removed",
                device.createdAt(),
                now
        ));
    }

    @Transactional
    public NotificationPreferenceReadModel getPreferences(UUID userId) {
        requireActiveUser(userId);
        return toReadModel(pushRepository.getOrCreatePreferences(userId, OffsetDateTime.now(ZoneOffset.UTC)));
    }

    @Transactional
    public NotificationPreferenceReadModel updatePreferences(UUID userId, UpdateNotificationPreferenceCommand command) {
        requireActiveUser(userId);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        PushRepository.NotificationPreferenceRecord preference = pushRepository.getOrCreatePreferences(userId, now);

        if (command.marketingPushEnabledPresent() && Boolean.TRUE.equals(command.marketingPushEnabled())) {
            throw new PushMarketingNotSupportedException();
        }

        NotificationPreferenceReadModel updated = pushRepository.savePreferences(new PushRepository.NotificationPreferenceMutation(
                preference.userId(),
                command.pushEnabledPresent() ? bool(command.pushEnabled()) : preference.pushEnabled(),
                command.chatPushEnabledPresent() ? bool(command.chatPushEnabled()) : preference.chatPushEnabled(),
                command.applicationPushEnabledPresent()
                        ? bool(command.applicationPushEnabled())
                        : preference.applicationPushEnabled(),
                command.sessionPushEnabledPresent() ? bool(command.sessionPushEnabled()) : preference.sessionPushEnabled(),
                command.supportPushEnabledPresent() ? bool(command.supportPushEnabled()) : preference.supportPushEnabled(),
                command.marketingPushEnabledPresent()
                        ? bool(command.marketingPushEnabled())
                        : preference.marketingPushEnabled(),
                preference.createdAt(),
                now
        ));
        dispatchRepository.skipPendingDeliveriesForPreferences(userId, now);
        return updated;
    }

    private void requireActiveUser(UUID userId) {
        PushRepository.UserAccountRecord user = pushRepository.findUserAccount(userId)
                .orElseThrow(PushNotificationProfileMissingException::new);
        requireActiveUser(user);
    }

    private void requireActiveUser(PushRepository.UserAccountRecord user) {
        if (user.deletedAt() != null) {
            throw new PushAccountDeletedException();
        }
        if (user.deactivatedAt() != null) {
            throw new PushAccountDeactivatedException();
        }
    }

    private NotificationPreferenceReadModel toReadModel(PushRepository.NotificationPreferenceRecord record) {
        return new NotificationPreferenceReadModel(
                record.userId(),
                record.pushEnabled(),
                record.chatPushEnabled(),
                record.applicationPushEnabled(),
                record.sessionPushEnabled(),
                record.supportPushEnabled(),
                record.marketingPushEnabled(),
                record.createdAt(),
                record.updatedAt()
        );
    }

    private boolean bool(Boolean value) {
        return Boolean.TRUE.equals(value);
    }

    private String defaultProviderForPlatform(String platform) {
        return "ios".equals(platform) ? "apns" : "fcm";
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
