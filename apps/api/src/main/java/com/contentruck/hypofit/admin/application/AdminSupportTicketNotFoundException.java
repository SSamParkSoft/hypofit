package com.contentruck.hypofit.admin.application;

import com.contentruck.hypofit.common.error.HypofitException;

public final class AdminSupportTicketNotFoundException extends HypofitException {

    public AdminSupportTicketNotFoundException() {
        super("not_found", "요청한 정보를 찾지 못했어요.", 404, "Support ticket not found");
    }
}
