package com.contentruck.hypofit.push.service;

import org.springframework.http.HttpStatus;

public final class PushPermissionDeniedException extends PushException {
    public PushPermissionDeniedException() {
        super(
                "push_permission_denied",
                "알림 권한을 먼저 허용해 주세요.",
                HttpStatus.CONFLICT,
                "Push permission is not granted"
        );
    }
}
