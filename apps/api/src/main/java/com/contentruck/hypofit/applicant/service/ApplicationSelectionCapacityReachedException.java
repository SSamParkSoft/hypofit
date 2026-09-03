package com.contentruck.hypofit.applicant.service;

import org.springframework.http.HttpStatus;

public final class ApplicationSelectionCapacityReachedException extends ApplicationSliceException {

    public ApplicationSelectionCapacityReachedException() {
        super(
                "application_selection_capacity_reached",
                "모집 인원이 모두 찼어요.",
                HttpStatus.CONFLICT,
                "Recruitment capacity has already been reached"
        );
    }
}
