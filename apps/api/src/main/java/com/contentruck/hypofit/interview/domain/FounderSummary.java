package com.contentruck.hypofit.interview.domain;

import java.util.UUID;

public record FounderSummary(
        UUID id,
        String name,
        String bio,
        String role,
        String profileImageUrl
) {
}
