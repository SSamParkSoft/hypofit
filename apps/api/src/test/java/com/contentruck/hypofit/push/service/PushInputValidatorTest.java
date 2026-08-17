package com.contentruck.hypofit.push.service;

import com.contentruck.hypofit.push.service.PushCommands.RegisterPushDeviceCommand;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.common.error.HypofitValidationException;
import org.junit.jupiter.api.Test;

class PushInputValidatorTest {

    @Test
    void validateRegisterRejectsExplicitNullForDefaultedFields() {
        assertThatThrownBy(() -> PushInputValidator.validateRegister(new RegisterPushDeviceCommand(
                "android",
                "fcm",
                null,
                "fcm-token-value",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "granted"
        )))
                .isInstanceOf(HypofitValidationException.class)
                .satisfies(exception -> assertThat(((HypofitValidationException) exception).getFieldErrors())
                        .extracting(fieldError -> fieldError.field())
                        .containsExactly("environment"));

        assertThatThrownBy(() -> PushInputValidator.validateRegister(new RegisterPushDeviceCommand(
                "android",
                "fcm",
                "production",
                "fcm-token-value",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        )))
                .isInstanceOf(HypofitValidationException.class)
                .satisfies(exception -> assertThat(((HypofitValidationException) exception).getFieldErrors())
                        .extracting(fieldError -> fieldError.field())
                        .containsExactly("permission_status"));
    }
}
