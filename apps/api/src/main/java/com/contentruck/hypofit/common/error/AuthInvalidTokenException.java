package com.contentruck.hypofit.common.error;

import org.springframework.http.HttpStatus;

public class AuthInvalidTokenException extends HypofitException {

    public AuthInvalidTokenException(String debugMessage) {
        super("auth_invalid_token", "로그인 정보를 다시 확인해 주세요.", HttpStatus.UNAUTHORIZED.value(), debugMessage);
    }
}
