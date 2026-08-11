package com.contentruck.hypofit.interviewview.application;

import org.springframework.http.HttpStatus;

public final class InterviewPostViewAccountDeactivatedException extends InterviewPostViewException {
    public InterviewPostViewAccountDeactivatedException() {
        super(
                "account_deactivated",
                "비활성화된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
