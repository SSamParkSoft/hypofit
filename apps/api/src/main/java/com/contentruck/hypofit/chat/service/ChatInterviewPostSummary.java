package com.contentruck.hypofit.chat.service;

import com.contentruck.hypofit.interview.service.PostingCompensation;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ChatInterviewPostSummary(
        UUID id,
        UUID founderId,
        String title,
        String serviceSummary,
        String targetDescription,
        int rewardAmount,
        int durationMinutes,
        int recruitCount,
        String interviewMode,
        String location,
        String locationText,
        String locationAddress,
        String locationPlaceName,
        Double locationLatitude,
        Double locationLongitude,
        String locationPrecision,
        String locationSource,
        List<String> scheduleOptions,
        String status,
        ChatUserSummary founder,
        ChatFounderReviewSummary founderReviewSummary,
        Double distanceMeters,
        String recruitmentType,
        String entryMode,
        List<PostingCompensation> compensations,
        Integer durationValue,
        String durationUnit,
        List<String> betaTestPlatforms,
        OffsetDateTime betaTestStartsAt,
        OffsetDateTime betaTestEndsAt
) {
}
