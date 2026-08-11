package com.contentruck.hypofit.application.service;

import org.springframework.http.HttpStatus;

public final class ApplicationNotFoundException extends ApplicationSliceException {
    public ApplicationNotFoundException(String debugMessage) {
        super(
                "not_found",
                "요청한 정보를 찾지 못했어요.",
                HttpStatus.NOT_FOUND,
                debugMessage
        );
    }
}
