package com.contentruck.hypofit.interview.dto;

import com.contentruck.hypofit.interview.service.InterviewPostListCriteria;
import com.contentruck.hypofit.interview.service.InterviewPostValidationException;
import java.util.Set;
import java.util.UUID;

public record InterviewPostListRequest(
        String status,
        String mode,
        UUID founderId,
        String q,
        Integer rewardMin,
        Integer rewardMax,
        Double lat,
        Double lng,
        Integer radiusM,
        String sort,
        Integer limit
) {

    private static final Set<String> ALLOWED_SORTS = Set.of("newest", "distance", "reward");
    private static final int MAX_QUERY_LENGTH = 100;
    private static final double MIN_LATITUDE = -90.0;
    private static final double MAX_LATITUDE = 90.0;
    private static final double MIN_LONGITUDE = -180.0;
    private static final double MAX_LONGITUDE = 180.0;

    public InterviewPostListCriteria toCriteria(UUID viewerId, boolean isAdmin, boolean supportsRecruitmentTypes) {
        validate();
        return new InterviewPostListCriteria(
                status,
                viewerId,
                isAdmin,
                supportsRecruitmentTypes,
                mode,
                founderId,
                q,
                rewardMin,
                rewardMax,
                lat,
                lng,
                radiusM,
                sort == null || sort.isBlank() ? "newest" : sort,
                limit == null ? 100 : limit
        );
    }

    private void validate() {
        boolean hasLat = lat != null;
        boolean hasLng = lng != null;

        if (q != null && q.length() > MAX_QUERY_LENGTH) {
            throw new InterviewPostValidationException("q must be at most 100 characters");
        }
        if (rewardMin != null && rewardMin < 0) {
            throw new InterviewPostValidationException("reward_min must be greater than or equal to 0");
        }
        if (rewardMax != null && rewardMax < 0) {
            throw new InterviewPostValidationException("reward_max must be greater than or equal to 0");
        }
        if (lat != null && (lat < MIN_LATITUDE || lat > MAX_LATITUDE)) {
            throw new InterviewPostValidationException("lat must be between -90 and 90");
        }
        if (lng != null && (lng < MIN_LONGITUDE || lng > MAX_LONGITUDE)) {
            throw new InterviewPostValidationException("lng must be between -180 and 180");
        }
        if (hasLat != hasLng) {
            throw new InterviewPostValidationException("lat and lng must be provided together");
        }
        if (radiusM != null && (!hasLat || !hasLng)) {
            throw new InterviewPostValidationException("radius_m requires lat and lng");
        }
        if ("distance".equals(sort) && (!hasLat || !hasLng)) {
            throw new InterviewPostValidationException("sort=distance requires lat and lng");
        }
        if (rewardMin != null && rewardMax != null && rewardMin > rewardMax) {
            throw new InterviewPostValidationException("reward_min must be less than or equal to reward_max");
        }
        if (radiusM != null && (radiusM < 500 || radiusM > 20000)) {
            throw new InterviewPostValidationException("radius_m must be between 500 and 20000");
        }
        if (limit != null && (limit < 1 || limit > 100)) {
            throw new InterviewPostValidationException("limit must be between 1 and 100");
        }
        if (sort != null && !ALLOWED_SORTS.contains(sort)) {
            throw new InterviewPostValidationException("sort must be one of newest, distance, reward");
        }
    }
}
