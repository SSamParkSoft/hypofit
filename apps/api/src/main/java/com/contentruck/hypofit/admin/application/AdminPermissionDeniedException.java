package com.contentruck.hypofit.admin.application;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public final class AdminPermissionDeniedException extends HypofitException {
    public AdminPermissionDeniedException() {
        super("permission_denied", "권한이 없어요.", HttpStatus.FORBIDDEN.value(), "Admin role required");
    }
}
