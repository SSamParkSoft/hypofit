package com.contentruck.hypofit.applicant.service;

import java.util.UUID;

public record ApplicationRespondentSummary(
        UUID id,
        String name,
        String bio,
        String role,
        String profileImageUrl
) {
}
