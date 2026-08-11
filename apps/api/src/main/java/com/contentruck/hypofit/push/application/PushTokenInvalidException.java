package com.contentruck.hypofit.push.application;

import org.springframework.http.HttpStatus;

public final class PushTokenInvalidException extends PushException {
    public PushTokenInvalidException() {
        super(
                "push_token_invalid",
                "기기 알림 설정을 확인해 주세요.",
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Push token payload is invalid"
        );
    }
}
