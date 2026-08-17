package com.contentruck.hypofit.chat.service;

import org.springframework.http.HttpStatus;

public final class ChatAccountDeletedException extends ChatUserAccountException {
    public ChatAccountDeletedException() {
        super(
                "account_deleted",
                "삭제된 계정이에요.",
                HttpStatus.FORBIDDEN,
                "Account is inactive"
        );
    }
}
