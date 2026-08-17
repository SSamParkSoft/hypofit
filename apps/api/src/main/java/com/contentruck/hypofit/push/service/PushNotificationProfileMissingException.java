package com.contentruck.hypofit.push.service;

import org.springframework.http.HttpStatus;

public final class PushNotificationProfileMissingException extends PushException {
    public PushNotificationProfileMissingException() {
        super(
                "profile_missing",
                "프로필 설정이 필요해요.",
                HttpStatus.FORBIDDEN,
                "Hypofit profile is required"
        );
    }
}
