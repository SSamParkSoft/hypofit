package com.contentruck.hypofit.user.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public sealed abstract class UserQueryException extends HypofitException
        permits UserProfileMissingException, UserAccountDeletedException, UserAccountDeactivatedException {

    protected UserQueryException(
            String code,
            String userMessage,
            HttpStatus status,
            String debugMessage
    ) {
        super(code, userMessage, status.value(), debugMessage);
    }

    public String code() {
        return getCode();
    }

    public String userMessage() {
        return getUserMessage();
    }

    public HttpStatus status() {
        return HttpStatus.valueOf(getStatus());
    }

    public String debugMessage() {
        return getDebugMessage();
    }
}
