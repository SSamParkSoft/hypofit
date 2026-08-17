package com.contentruck.hypofit.push.service;

import org.springframework.http.HttpStatus;

public final class PushAccountDeactivatedException extends PushException {
    public PushAccountDeactivatedException() {
        super(
                "account_deactivated",
                "비활성화된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
