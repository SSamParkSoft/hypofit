package com.contentruck.hypofit.user.service;

import org.springframework.http.HttpStatus;

public final class UserAccountDeletedException extends UserQueryException {
    public UserAccountDeletedException() {
        super(
                "account_deleted",
                "삭제된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
