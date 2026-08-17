package com.contentruck.hypofit.interview.service;

import org.springframework.http.HttpStatus;

public final class InterviewPostValidationException extends InterviewPostQueryException {
    public InterviewPostValidationException(String debugMessage) {
        super(
                "validation_failed",
                "입력값을 확인해 주세요.",
                HttpStatus.UNPROCESSABLE_ENTITY,
                debugMessage
        );
    }
}
