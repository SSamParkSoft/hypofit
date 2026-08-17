package com.contentruck.hypofit.interviewview.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public sealed abstract class InterviewPostViewException extends HypofitException
        permits InterviewPostViewProfileMissingException,
        InterviewPostViewAccountDeletedException,
        InterviewPostViewAccountDeactivatedException,
        InterviewPostViewNotFoundException {

    protected InterviewPostViewException(
            String code,
            String userMessage,
            HttpStatus status,
            String debugMessage
    ) {
        super(code, userMessage, status.value(), debugMessage);
    }
}
