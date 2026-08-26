package com.contentruck.hypofit.applicant.service;

import java.util.UUID;

public record InterviewPostOwnership(
        UUID id,
        UUID founderId,
        String title,
        String recruitmentType
) {
}
