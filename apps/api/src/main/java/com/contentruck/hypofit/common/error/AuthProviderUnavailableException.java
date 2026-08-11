package com.contentruck.hypofit.common.error;

import org.springframework.http.HttpStatus;

public class AuthProviderUnavailableException extends HypofitException {

    public AuthProviderUnavailableException(String debugMessage) {
        super(
                "auth_provider_unavailable",
                "로그인 확인이 지연되고 있어요.",
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                debugMessage
        );
    }
}
