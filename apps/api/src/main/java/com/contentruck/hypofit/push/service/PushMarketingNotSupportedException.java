package com.contentruck.hypofit.push.service;

import org.springframework.http.HttpStatus;

public final class PushMarketingNotSupportedException extends PushException {
    public PushMarketingNotSupportedException() {
        super(
                "push_marketing_not_supported",
                "마케팅 알림은 아직 지원하지 않아요.",
                HttpStatus.CONFLICT,
                "Marketing push is not supported"
        );
    }
}
