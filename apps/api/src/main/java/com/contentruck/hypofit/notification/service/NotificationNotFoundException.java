package com.contentruck.hypofit.notification.service;

import org.springframework.http.HttpStatus;

public final class NotificationNotFoundException extends NotificationException {
    public NotificationNotFoundException() {
        super(
                "not_found",
                "요청한 정보를 찾지 못했어요.",
                HttpStatus.NOT_FOUND,
                "Notification not found"
        );
    }
}
