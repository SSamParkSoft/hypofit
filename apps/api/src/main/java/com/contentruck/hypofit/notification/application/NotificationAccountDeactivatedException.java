package com.contentruck.hypofit.notification.application;

import org.springframework.http.HttpStatus;

public final class NotificationAccountDeactivatedException extends NotificationException {
    public NotificationAccountDeactivatedException() {
        super(
                "account_deactivated",
                "비활성화된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
