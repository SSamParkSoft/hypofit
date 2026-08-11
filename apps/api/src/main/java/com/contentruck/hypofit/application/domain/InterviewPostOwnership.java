package com.contentruck.hypofit.application.domain;

import java.util.UUID;

public record InterviewPostOwnership(
        UUID id,
        UUID founderId,
        String title
) {
}
