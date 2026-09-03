package com.contentruck.hypofit.applicant.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public sealed abstract class ApplicationSliceException extends HypofitException
        permits ApplicationConflictException, ApplicationNotFoundException,
        ApplicationPermissionDeniedException, ApplicationRecruitmentTypeActionNotAllowedException,
        ApplicationSelectionCapacityReachedException, ApplicationValidationException {

    protected ApplicationSliceException(
            String code,
            String userMessage,
            HttpStatus status,
            String debugMessage
    ) {
        super(code, userMessage, status.value(), debugMessage);
    }
}
