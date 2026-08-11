package com.contentruck.hypofit.application.service;

import org.springframework.http.HttpStatus;

public final class ApplicationConflictException extends ApplicationSliceException {
    public ApplicationConflictException(String debugMessage) {
        super(
                "conflict",
                "이미 처리된 요청이에요.",
                HttpStatus.CONFLICT,
                debugMessage
        );
    }
}
