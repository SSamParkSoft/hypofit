package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.error.HypofitException;
import org.springframework.http.HttpStatus;

public final class InterviewPostRecruitmentTypeNotSupportedException extends HypofitException {
    public InterviewPostRecruitmentTypeNotSupportedException(String recruitmentType) {
        super(
                "recruitment_type_not_supported",
                "아직 지원하지 않는 모집 형식이에요.",
                HttpStatus.UNPROCESSABLE_ENTITY.value(),
                "Recruitment type not supported by current create/update flow: " + recruitmentType
        );
    }
}
