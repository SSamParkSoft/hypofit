package com.contentruck.hypofit.push.service;

import org.springframework.http.HttpStatus;

public final class PushProfileRequiredException extends PushException {
    public PushProfileRequiredException() {
        super(
                "push_profile_required",
                "프로필 설정 후 알림을 사용할 수 있어요.",
                HttpStatus.FORBIDDEN,
                "Push device registration requires a synced app profile."
        );
    }
}
