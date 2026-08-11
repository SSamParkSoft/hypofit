package com.contentruck.hypofit.common.error;

import org.springframework.http.HttpStatus;

public class AuthTokenExpiredException extends HypofitException {

    public AuthTokenExpiredException() {
        super("auth_token_expired", "다시 로그인해 주세요.", HttpStatus.UNAUTHORIZED.value(), "Token expired");
    }
}
