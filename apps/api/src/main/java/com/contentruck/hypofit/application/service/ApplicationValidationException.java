package com.contentruck.hypofit.application.service;

import org.springframework.http.HttpStatus;

public final class ApplicationValidationException extends ApplicationSliceException {
    public ApplicationValidationException(String debugMessage) {
        super(
                "validation_failed",
                "입력값을 확인해 주세요.",
                HttpStatus.UNPROCESSABLE_ENTITY,
                debugMessage
        );
    }
}
