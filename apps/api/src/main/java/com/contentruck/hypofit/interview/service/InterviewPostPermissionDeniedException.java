package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public final class InterviewPostPermissionDeniedException extends HypofitException {
    public InterviewPostPermissionDeniedException(String debugMessage) {
        super(
                "permission_denied",
                "권한이 없어요.",
                HttpStatus.FORBIDDEN.value(),
                debugMessage
        );
    }
}
