package com.contentruck.hypofit.push.controller;

import com.contentruck.hypofit.push.dto.NotificationPreferenceResponse;
import com.contentruck.hypofit.push.dto.NotificationPreferenceUpdateRequest;
import com.contentruck.hypofit.push.dto.PushDeviceRegisterRequest;
import com.contentruck.hypofit.push.dto.PushDeviceResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.error.AuthRequiredException;
import com.contentruck.hypofit.push.service.PushService;
import com.contentruck.hypofit.push.service.NotificationPreferenceReadModel;
import com.contentruck.hypofit.push.service.PushDeviceReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class PushControllerTest {

    @Mock
    private PushService pushService;

    @Test
    void registerPushDeviceUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        PushDeviceRegisterRequest request = new PushDeviceRegisterRequest();
        request.setPlatform("android");
        request.setProvider("fcm");
        request.setEnvironment("production");
        request.setToken("fcm-token-value");
        request.setPermissionStatus("granted");
        when(pushService.registerPushDevice(userId, request.toCommand())).thenReturn(device());

        PushController controller = new PushController(pushService);
        PushDeviceResponse response = controller.registerPushDevice(jwt(userId), request);

        assertThat(response.provider()).isEqualTo("fcm");
        verify(pushService).registerPushDevice(userId, request.toCommand());
    }

    @Test
    void notificationPreferenceEndpointsUseJwtSubject() {
        UUID userId = UUID.randomUUID();
        NotificationPreferenceUpdateRequest request = new NotificationPreferenceUpdateRequest();
        request.setChatPushEnabled(false);
        when(pushService.getPreferences(userId)).thenReturn(preferences(userId));
        when(pushService.updatePreferences(userId, request.toCommand())).thenReturn(preferences(userId));

        PushController controller = new PushController(pushService);
        NotificationPreferenceResponse getResponse = controller.getNotificationPreferences(jwt(userId));
        NotificationPreferenceResponse patchResponse = controller.updateNotificationPreferences(jwt(userId), request);

        assertThat(getResponse.userId()).isEqualTo(userId);
        assertThat(patchResponse.userId()).isEqualTo(userId);
        verify(pushService).getPreferences(userId);
        verify(pushService).updatePreferences(userId, request.toCommand());
    }

    @Test
    void disablePushDeviceUsesOwnershipRoute() {
        UUID userId = UUID.randomUUID();
        UUID deviceId = UUID.randomUUID();

        PushController controller = new PushController(pushService);
        controller.disablePushDevice(jwt(userId), deviceId);

        verify(pushService).disablePushDevice(userId, deviceId);
    }

    @Test
    void controllerRequiresJwtSubject() {
        PushController controller = new PushController(pushService);

        assertThatThrownBy(() -> controller.getNotificationPreferences(null))
                .isInstanceOf(AuthRequiredException.class);
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }

    private PushDeviceReadModel device() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return new PushDeviceReadModel(
                UUID.randomUUID(),
                "android",
                "fcm",
                "production",
                "inst_123",
                null,
                "1.0.0",
                "1",
                "35",
                "ko-KR",
                "Asia/Seoul",
                "granted",
                true,
                now,
                null,
                null,
                null,
                null,
                now,
                now
        );
    }

    private NotificationPreferenceReadModel preferences(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return new NotificationPreferenceReadModel(
                userId,
                true,
                true,
                true,
                true,
                true,
                false,
                now.minusDays(1),
                now
        );
    }
}
