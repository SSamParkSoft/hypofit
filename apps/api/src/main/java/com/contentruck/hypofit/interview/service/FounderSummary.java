package com.contentruck.hypofit.interview.service;

import java.util.UUID;

public record FounderSummary(
        UUID id,
        String name,
        String bio,
        String role,
        String profileImageUrl,
        String organizationType,
        String organizationName
) {
}
