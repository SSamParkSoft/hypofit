package com.contentruck.hypofit.support.service;

import com.contentruck.hypofit.common.error.HypofitException;

public final class SupportTicketNotFoundException extends HypofitException {
    public SupportTicketNotFoundException() {
        super("not_found", "요청한 정보를 찾지 못했어요.", 404, "Support ticket not found");
    }
}
