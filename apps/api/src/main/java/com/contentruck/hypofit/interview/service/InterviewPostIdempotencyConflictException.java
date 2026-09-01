package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public final class InterviewPostIdempotencyConflictException extends HypofitException {
    public InterviewPostIdempotencyConflictException() {
        super(
                "idempotency_key_reused",
                "이미 처리된 요청이에요. 새 공고를 올리려면 다시 시도해 주세요.",
                HttpStatus.CONFLICT.value(),
                "Client submission ID was reused with a different payload"
        );
    }
}
