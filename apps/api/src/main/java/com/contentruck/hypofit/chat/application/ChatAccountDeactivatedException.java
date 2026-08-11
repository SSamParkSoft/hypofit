package com.contentruck.hypofit.chat.application;

import org.springframework.http.HttpStatus;

public final class ChatAccountDeactivatedException extends ChatUserAccountException {
    public ChatAccountDeactivatedException() {
        super(
                "account_deactivated",
                "비활성화된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
