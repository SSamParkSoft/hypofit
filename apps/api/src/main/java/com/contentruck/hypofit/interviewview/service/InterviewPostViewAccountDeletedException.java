package com.contentruck.hypofit.interviewview.service;

import org.springframework.http.HttpStatus;

public final class InterviewPostViewAccountDeletedException extends InterviewPostViewException {
    public InterviewPostViewAccountDeletedException() {
        super(
                "account_deleted",
                "삭제된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
