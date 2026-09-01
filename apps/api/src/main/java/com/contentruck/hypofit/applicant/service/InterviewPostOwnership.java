package com.contentruck.hypofit.applicant.service;

import java.util.UUID;

public record InterviewPostOwnership(
        UUID id,
        UUID founderId,
        String title,
        String recruitmentType,
        String entryMode
) {
    public InterviewPostOwnership(UUID id, UUID founderId, String title, String recruitmentType) {
        this(id, founderId, title, recruitmentType, "application_required");
    }
}
