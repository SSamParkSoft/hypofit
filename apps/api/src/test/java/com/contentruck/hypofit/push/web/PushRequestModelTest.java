package com.contentruck.hypofit.push.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class PushRequestModelTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void pushDeviceRegisterDefaultsApplyOnlyWhenFieldsAreOmitted() throws Exception {
        PushDeviceRegisterRequest omittedDefaults = objectMapper.readValue(
                """
                        {
                          "platform": "android",
                          "provider": "fcm",
                          "token": "fcm-token-value"
                        }
                        """,
                PushDeviceRegisterRequest.class
        );

        assertThat(omittedDefaults.toCommand().environment()).isEqualTo("production");
        assertThat(omittedDefaults.toCommand().permissionStatus()).isEqualTo("granted");

        PushDeviceRegisterRequest explicitNulls = objectMapper.readValue(
                """
                        {
                          "platform": "android",
                          "provider": "fcm",
                          "environment": null,
                          "token": "fcm-token-value",
                          "permission_status": null
                        }
                        """,
                PushDeviceRegisterRequest.class
        );

        assertThat(explicitNulls.toCommand().environment()).isNull();
        assertThat(explicitNulls.toCommand().permissionStatus()).isNull();
    }

    @Test
    void notificationPreferenceUpdatePreservesOmissionAndExplicitNullSeparately() throws Exception {
        NotificationPreferenceUpdateRequest omitted = objectMapper.readValue(
                "{}",
                NotificationPreferenceUpdateRequest.class
        );

        assertThat(omitted.toCommand().chatPushEnabledPresent()).isFalse();
        assertThat(omitted.toCommand().chatPushEnabled()).isNull();

        NotificationPreferenceUpdateRequest explicitNull = objectMapper.readValue(
                """
                        {
                          "chat_push_enabled": null
                        }
                        """,
                NotificationPreferenceUpdateRequest.class
        );

        assertThat(explicitNull.toCommand().chatPushEnabledPresent()).isTrue();
        assertThat(explicitNull.toCommand().chatPushEnabled()).isNull();
    }
}
