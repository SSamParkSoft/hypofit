package com.contentruck.hypofit.block.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public final class BlockNotFoundException extends HypofitException {
    public BlockNotFoundException(String debugMessage) {
        super(
                "not_found",
                "요청한 정보를 찾지 못했어요.",
                HttpStatus.NOT_FOUND.value(),
                debugMessage
        );
    }
}
