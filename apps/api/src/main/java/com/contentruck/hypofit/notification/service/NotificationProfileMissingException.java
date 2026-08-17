package com.contentruck.hypofit.notification.service;

import org.springframework.http.HttpStatus;

public final class NotificationProfileMissingException extends NotificationException {
    public NotificationProfileMissingException() {
        super(
                "profile_missing",
                "프로필 설정이 필요해요.",
                HttpStatus.FORBIDDEN,
                "Hypofit profile is required"
        );
    }
}
