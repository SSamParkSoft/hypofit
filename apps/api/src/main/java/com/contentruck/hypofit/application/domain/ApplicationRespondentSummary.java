package com.contentruck.hypofit.application.domain;

import java.util.UUID;

public record ApplicationRespondentSummary(
        UUID id,
        String name,
        String bio,
        String role,
        String profileImageUrl
) {
}
