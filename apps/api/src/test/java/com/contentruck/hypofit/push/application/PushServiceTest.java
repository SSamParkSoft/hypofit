package com.contentruck.hypofit.push.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.push.application.PushCommands.RegisterPushDeviceCommand;
import com.contentruck.hypofit.push.application.PushCommands.UpdateNotificationPreferenceCommand;
import com.contentruck.hypofit.push.domain.NotificationPreferenceReadModel;
import com.contentruck.hypofit.push.domain.PushDeviceReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PushServiceTest {

    @Mock
    private PushRepository pushRepository;

    private PushService pushService;

    @BeforeEach
    void setUp() {
        pushService = new PushService(pushRepository);
    }

    @Test
    void registerPushDeviceUpsertsTokenMatchedDeviceAndEnablesPreferences() {
        UUID userId = UUID.randomUUID();
        UUID existingDeviceId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1);
        when(pushRepository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(pushRepository.findPushDevice(
                org.mockito.ArgumentMatchers.eq("fcm"),
                org.mockito.ArgumentMatchers.eq("production"),
                org.mockito.ArgumentMatchers.any()
        ))
                .thenReturn(Optional.of(existingDevice(existingDeviceId, userId, now)));
        when(pushRepository.savePushDevice(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> toDeviceReadModel(invocation.getArgument(0)));
        when(pushRepository.getOrCreatePreferences(org.mockito.ArgumentMatchers.eq(userId), org.mockito.ArgumentMatchers.any()))
                .thenReturn(preferences(userId, false));
        when(pushRepository.savePreferences(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> toPreferenceReadModel(invocation.getArgument(0)));

        PushDeviceReadModel device = pushService.registerPushDevice(userId, new RegisterPushDeviceCommand(
                "android",
                "fcm",
                "production",
                "fcm-token-value",
                "inst_123",
                null,
                "1.0.0",
                "1",
                "35",
                "ko-KR",
                "Asia/Seoul",
                "granted"
        ));

        assertThat(device.id()).isEqualTo(existingDeviceId);
        assertThat(device.enabled()).isTrue();
        assertThat(device.permissionStatus()).isEqualTo("granted");
        verify(pushRepository).savePreferences(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void registerPushDeviceRequiresPushProfileAndGrantedPermission() {
        UUID userId = UUID.randomUUID();
        when(pushRepository.findUserAccount(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pushService.registerPushDevice(userId, new RegisterPushDeviceCommand(
                "android", "fcm", "production", "fcm-token-value", null, null, null, null, null, null, null, "granted"
        ))).isInstanceOf(PushProfileRequiredException.class);

        when(pushRepository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        assertThatThrownBy(() -> pushService.registerPushDevice(userId, new RegisterPushDeviceCommand(
                "android", "fcm", "production", "fcm-token-value", null, null, null, null, null, null, null, "denied"
        ))).isInstanceOf(PushPermissionDeniedException.class);
    }

    @Test
    void registerPushDeviceRejectsProviderPlatformMismatch() {
        UUID userId = UUID.randomUUID();
        when(pushRepository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));

        assertThatThrownBy(() -> pushService.registerPushDevice(userId, new RegisterPushDeviceCommand(
                "android", "apns", "production", "fcm-token-value", null, null, null, null, null, null, null, "granted"
        ))).isInstanceOf(PushTokenInvalidException.class);
    }

    @Test
    void disablePushDeviceRequiresOwnership() {
        UUID userId = UUID.randomUUID();
        UUID pushDeviceId = UUID.randomUUID();
        when(pushRepository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(pushRepository.findUserPushDevice(pushDeviceId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pushService.disablePushDevice(userId, pushDeviceId))
                .isInstanceOf(PushDeviceNotFoundException.class);
    }

    @Test
    void disablePushDeviceMarksDeviceDisabled() {
        UUID userId = UUID.randomUUID();
        UUID pushDeviceId = UUID.randomUUID();
        PushRepository.PushDeviceRecord device = existingDevice(pushDeviceId, userId, OffsetDateTime.now(ZoneOffset.UTC));
        when(pushRepository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(pushRepository.findUserPushDevice(pushDeviceId, userId)).thenReturn(Optional.of(device));
        when(pushRepository.savePushDevice(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> toDeviceReadModel(invocation.getArgument(0)));

        pushService.disablePushDevice(userId, pushDeviceId);

        ArgumentCaptor<PushRepository.PushDeviceMutation> captor = ArgumentCaptor.forClass(PushRepository.PushDeviceMutation.class);
        verify(pushRepository).savePushDevice(captor.capture());
        assertThat(captor.getValue().enabled()).isFalse();
        assertThat(captor.getValue().disabledReason()).isEqualTo("user_removed");
    }

    @Test
    void getPreferencesCreatesDefaultsThroughRepository() {
        UUID userId = UUID.randomUUID();
        when(pushRepository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(pushRepository.getOrCreatePreferences(org.mockito.ArgumentMatchers.eq(userId), org.mockito.ArgumentMatchers.any()))
                .thenReturn(preferences(userId, false));

        NotificationPreferenceReadModel result = pushService.getPreferences(userId);

        assertThat(result.pushEnabled()).isFalse();
        assertThat(result.chatPushEnabled()).isTrue();
    }

    @Test
    void updatePreferencesPreservesOmittedFieldsAndRejectsMarketingTrue() {
        UUID userId = UUID.randomUUID();
        when(pushRepository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(pushRepository.getOrCreatePreferences(org.mockito.ArgumentMatchers.eq(userId), org.mockito.ArgumentMatchers.any()))
                .thenReturn(preferences(userId, true));
        when(pushRepository.savePreferences(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> toPreferenceReadModel(invocation.getArgument(0)));

        NotificationPreferenceReadModel updated = pushService.updatePreferences(userId, new UpdateNotificationPreferenceCommand(
                false, null,
                true, Boolean.FALSE,
                false, null,
                false, null,
                false, null,
                false, null
        ));

        assertThat(updated.pushEnabled()).isTrue();
        assertThat(updated.chatPushEnabled()).isFalse();

        assertThatThrownBy(() -> pushService.updatePreferences(userId, new UpdateNotificationPreferenceCommand(
                false, null,
                false, null,
                false, null,
                false, null,
                false, null,
                true, Boolean.TRUE
        ))).isInstanceOf(PushMarketingNotSupportedException.class);
    }

    private PushRepository.UserAccountRecord activeUser(UUID userId) {
        return new PushRepository.UserAccountRecord(userId, null, null);
    }

    private PushRepository.PushDeviceRecord existingDevice(UUID deviceId, UUID userId, OffsetDateTime createdAt) {
        return new PushRepository.PushDeviceRecord(
                deviceId,
                userId,
                "android",
                "fcm",
                "production",
                "old-token",
                "old-hash",
                "inst-old",
                null,
                "1.0.0",
                "1",
                "35",
                "ko-KR",
                "Asia/Seoul",
                "granted",
                true,
                createdAt,
                null,
                null,
                0,
                null,
                null,
                createdAt,
                createdAt
        );
    }

    private PushDeviceReadModel toDeviceReadModel(PushRepository.PushDeviceMutation mutation) {
        return new PushDeviceReadModel(
                mutation.id() == null ? UUID.randomUUID() : mutation.id(),
                mutation.platform(),
                mutation.provider(),
                mutation.environment(),
                mutation.installationId(),
                mutation.deviceLabel(),
                mutation.appVersion(),
                mutation.buildNumber(),
                mutation.osVersion(),
                mutation.locale(),
                mutation.timezone(),
                mutation.permissionStatus(),
                mutation.enabled(),
                mutation.lastRegisteredAt(),
                mutation.lastSuccessAt(),
                mutation.lastFailureAt(),
                mutation.disabledAt(),
                mutation.disabledReason(),
                mutation.createdAt(),
                mutation.updatedAt()
        );
    }

    private PushRepository.NotificationPreferenceRecord preferences(UUID userId, boolean pushEnabled) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return new PushRepository.NotificationPreferenceRecord(
                userId,
                pushEnabled,
                true,
                true,
                true,
                true,
                false,
                now.minusDays(1),
                now
        );
    }

    private NotificationPreferenceReadModel toPreferenceReadModel(
            PushRepository.NotificationPreferenceMutation mutation
    ) {
        return new NotificationPreferenceReadModel(
                mutation.userId(),
                mutation.pushEnabled(),
                mutation.chatPushEnabled(),
                mutation.applicationPushEnabled(),
                mutation.sessionPushEnabled(),
                mutation.supportPushEnabled(),
                mutation.marketingPushEnabled(),
                mutation.createdAt(),
                mutation.updatedAt()
        );
    }
}
