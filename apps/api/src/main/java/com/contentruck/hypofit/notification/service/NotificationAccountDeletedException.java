package com.contentruck.hypofit.notification.service;

import org.springframework.http.HttpStatus;

public final class NotificationAccountDeletedException extends NotificationException {
    public NotificationAccountDeletedException() {
        super(
                "account_deleted",
                "삭제된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
