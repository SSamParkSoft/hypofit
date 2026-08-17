package com.contentruck.hypofit.push.service;

import org.springframework.http.HttpStatus;

public final class PushDeviceNotFoundException extends PushException {
    public PushDeviceNotFoundException() {
        super(
                "not_found",
                "요청한 정보를 찾지 못했어요.",
                HttpStatus.NOT_FOUND,
                "Push device not found"
        );
    }
}
