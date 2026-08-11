package com.contentruck.hypofit.interview.application;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public sealed abstract class InterviewPostQueryException extends HypofitException
        permits InterviewPostNotFoundException, InterviewPostValidationException {

    protected InterviewPostQueryException(
            String code,
            String userMessage,
            HttpStatus status,
            String debugMessage
    ) {
        super(code, userMessage, status.value(), debugMessage);
    }

    public String code() {
        return getCode();
    }

    public String userMessage() {
        return getUserMessage();
    }

    public HttpStatus status() {
        return HttpStatus.valueOf(getStatus());
    }

    public String debugMessage() {
        return getDebugMessage();
    }
}
