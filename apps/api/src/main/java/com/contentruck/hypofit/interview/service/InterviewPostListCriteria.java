package com.contentruck.hypofit.interview.service;

import java.util.UUID;

public record InterviewPostListCriteria(
        String status,
        UUID viewerId,
        boolean admin,
        boolean supportsRecruitmentTypes,
        String mode,
        UUID founderId,
        String query,
        Integer rewardMin,
        Integer rewardMax,
        Double latitude,
        Double longitude,
        Integer radiusMeters,
        String sort,
        int limit,
        boolean supportsResearchRecruitment,
        String recruitmentType,
        String compensationType
) {
    public InterviewPostListCriteria(String status, UUID viewerId, boolean admin, boolean supportsRecruitmentTypes,
            String mode, UUID founderId, String query, Integer rewardMin, Integer rewardMax,
            Double latitude, Double longitude, Integer radiusMeters, String sort, int limit) {
        this(status, viewerId, admin, supportsRecruitmentTypes, mode, founderId, query, rewardMin, rewardMax,
                latitude, longitude, radiusMeters, sort, limit, false, null, null);
    }

    public InterviewPostListCriteria(String status, UUID viewerId, boolean admin, boolean supportsRecruitmentTypes,
            String mode, UUID founderId, String query, Integer rewardMin, Integer rewardMax,
            Double latitude, Double longitude, Integer radiusMeters, String sort, int limit,
            boolean supportsResearchRecruitment) {
        this(status, viewerId, admin, supportsRecruitmentTypes, mode, founderId, query, rewardMin, rewardMax,
                latitude, longitude, radiusMeters, sort, limit, supportsResearchRecruitment, null, null);
    }
}
