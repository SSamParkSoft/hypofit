package com.contentruck.hypofit.user.service;

import org.springframework.http.HttpStatus;

public final class UserProfileMissingException extends UserQueryException {
    public UserProfileMissingException() {
        super(
                "profile_missing",
                "프로필 설정이 필요해요.",
                HttpStatus.FORBIDDEN,
                "Hypofit profile is required"
        );
    }
}
