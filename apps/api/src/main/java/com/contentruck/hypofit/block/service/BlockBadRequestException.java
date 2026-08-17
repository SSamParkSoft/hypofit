package com.contentruck.hypofit.block.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public final class BlockBadRequestException extends HypofitException {
    public BlockBadRequestException(String debugMessage) {
        super(
                "request_failed",
                "요청을 처리하지 못했어요.",
                HttpStatus.BAD_REQUEST.value(),
                debugMessage
        );
    }
}
