package com.contentruck.hypofit.applicant.service;

import org.springframework.http.HttpStatus;

public final class ApplicationRecruitmentTypeActionNotAllowedException extends ApplicationSliceException {
    public ApplicationRecruitmentTypeActionNotAllowedException(String debugMessage) {
        super(
                "recruitment_type_action_not_allowed",
                "이 모집 형식에서는 사용할 수 없는 기능이에요.",
                HttpStatus.BAD_REQUEST,
                debugMessage
        );
    }
}
