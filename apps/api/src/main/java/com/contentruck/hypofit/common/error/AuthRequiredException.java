package com.contentruck.hypofit.common.error;

import org.springframework.http.HttpStatus;

public class AuthRequiredException extends HypofitException {

    public AuthRequiredException(String debugMessage) {
        super("auth_required", "로그인이 필요해요.", HttpStatus.UNAUTHORIZED.value(), debugMessage);
    }
}
