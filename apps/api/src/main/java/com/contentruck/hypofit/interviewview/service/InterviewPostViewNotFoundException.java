package com.contentruck.hypofit.interviewview.service;

import org.springframework.http.HttpStatus;

public final class InterviewPostViewNotFoundException extends InterviewPostViewException {
    public InterviewPostViewNotFoundException() {
        super(
                "not_found",
                "요청한 정보를 찾지 못했어요.",
                HttpStatus.NOT_FOUND,
                "Interview post not found"
        );
    }
}
