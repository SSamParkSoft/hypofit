package com.contentruck.hypofit.push.service;

import org.springframework.http.HttpStatus;

public final class PushAccountDeletedException extends PushException {
    public PushAccountDeletedException() {
        super(
                "account_deleted",
                "삭제된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
