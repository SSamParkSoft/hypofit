package com.contentruck.hypofit.support.service;

import com.contentruck.hypofit.common.error.HypofitException;

public final class SupportTicketConflictException extends HypofitException {
    public SupportTicketConflictException(String debugMessage) {
        super("conflict", "이미 처리된 요청이에요.", 409, debugMessage);
    }
}
