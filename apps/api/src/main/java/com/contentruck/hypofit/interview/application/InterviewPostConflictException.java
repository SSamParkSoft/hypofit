package com.contentruck.hypofit.interview.application;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public final class InterviewPostConflictException extends HypofitException {
    public InterviewPostConflictException(String debugMessage) {
        super(
                "conflict",
                "이미 처리된 요청이에요.",
                HttpStatus.CONFLICT.value(),
                debugMessage
        );
    }
}
