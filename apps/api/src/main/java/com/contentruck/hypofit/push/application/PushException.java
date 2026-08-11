package com.contentruck.hypofit.push.application;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public sealed abstract class PushException extends HypofitException
        permits PushProfileRequiredException,
        PushNotificationProfileMissingException,
        PushAccountDeletedException,
        PushAccountDeactivatedException,
        PushTokenInvalidException,
        PushPermissionDeniedException,
        PushDeviceNotFoundException,
        PushMarketingNotSupportedException {

    protected PushException(
            String code,
            String userMessage,
            HttpStatus status,
            String debugMessage
    ) {
        super(code, userMessage, status.value(), debugMessage);
    }
}
