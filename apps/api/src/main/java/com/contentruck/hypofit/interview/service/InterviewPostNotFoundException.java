package com.contentruck.hypofit.interview.service;

import org.springframework.http.HttpStatus;

public final class InterviewPostNotFoundException extends InterviewPostQueryException {
    public InterviewPostNotFoundException() {
        super(
                "not_found",
                "요청한 정보를 찾지 못했어요.",
                HttpStatus.NOT_FOUND,
                "Interview post not found"
        );
    }
}
