package com.contentruck.hypofit.notification.application;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public sealed abstract class NotificationException extends HypofitException
        permits NotificationProfileMissingException,
        NotificationAccountDeletedException,
        NotificationAccountDeactivatedException,
        NotificationNotFoundException {

    protected NotificationException(
            String code,
            String userMessage,
            HttpStatus status,
            String debugMessage
    ) {
        super(code, userMessage, status.value(), debugMessage);
    }
}
