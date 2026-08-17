package com.contentruck.hypofit.chat.service;

import org.springframework.http.HttpStatus;

public final class ChatProfileMissingException extends ChatUserAccountException {
    public ChatProfileMissingException() {
        super(
                "profile_missing",
                "프로필 설정이 필요해요.",
                HttpStatus.FORBIDDEN,
                "Hypofit profile is required"
        );
    }
}
