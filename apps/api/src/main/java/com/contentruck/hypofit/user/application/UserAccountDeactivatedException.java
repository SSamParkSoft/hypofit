package com.contentruck.hypofit.user.application;

import org.springframework.http.HttpStatus;

public final class UserAccountDeactivatedException extends UserQueryException {
    public UserAccountDeactivatedException() {
        super(
                "account_deactivated",
                "비활성화된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
