package com.contentruck.hypofit.chat.application;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public sealed abstract class ChatUserAccountException extends HypofitException
        permits ChatProfileMissingException, ChatAccountDeletedException, ChatAccountDeactivatedException {

    protected ChatUserAccountException(
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
