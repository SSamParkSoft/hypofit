package com.contentruck.hypofit.applicant.service;

import org.springframework.http.HttpStatus;

public final class ApplicationPermissionDeniedException extends ApplicationSliceException {
    public ApplicationPermissionDeniedException(String debugMessage) {
        super(
                "permission_denied",
                "권한이 없어요.",
                HttpStatus.FORBIDDEN,
                debugMessage
        );
    }
}
