package com.contentruck.hypofit.interviewview.application;

import org.springframework.http.HttpStatus;

public final class InterviewPostViewProfileMissingException extends InterviewPostViewException {
    public InterviewPostViewProfileMissingException() {
        super(
                "profile_missing",
                "프로필 설정이 필요해요.",
                HttpStatus.FORBIDDEN,
                "Hypofit profile is required"
        );
    }
}
