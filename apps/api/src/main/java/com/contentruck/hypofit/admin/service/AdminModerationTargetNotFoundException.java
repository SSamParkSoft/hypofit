package com.contentruck.hypofit.admin.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public final class AdminModerationTargetNotFoundException extends HypofitException {

    public AdminModerationTargetNotFoundException(String debugMessage) {
        super("not_found", "요청한 정보를 찾지 못했어요.", HttpStatus.NOT_FOUND.value(), debugMessage);
    }
}
