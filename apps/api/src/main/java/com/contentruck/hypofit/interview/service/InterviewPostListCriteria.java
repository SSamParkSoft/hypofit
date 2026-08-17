package com.contentruck.hypofit.interview.service;

import java.util.UUID;

public record InterviewPostListCriteria(
        String status,
        UUID viewerId,
        boolean admin,
        String mode,
        UUID founderId,
        String query,
        Integer rewardMin,
        Integer rewardMax,
        Double latitude,
        Double longitude,
        Integer radiusMeters,
        String sort,
        int limit
) {
}
