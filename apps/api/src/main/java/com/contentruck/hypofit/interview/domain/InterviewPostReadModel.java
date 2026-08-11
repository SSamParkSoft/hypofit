package com.contentruck.hypofit.interview.domain;

import java.util.List;
import java.util.UUID;

public record InterviewPostReadModel(
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
        FounderSummary founder,
        FounderReviewSummary founderReviewSummary,
        Double distanceMeters,
        InterviewAiSummaryReadModel aiSummary
) {
    public InterviewPostReadModel(
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
            FounderSummary founder,
            FounderReviewSummary founderReviewSummary,
            Double distanceMeters
    ) {
        this(
                id,
                founderId,
                title,
                serviceSummary,
                targetDescription,
                rewardAmount,
                durationMinutes,
                recruitCount,
                interviewMode,
                location,
                locationText,
                locationAddress,
                locationPlaceName,
                locationLatitude,
                locationLongitude,
                locationPrecision,
                locationSource,
                scheduleOptions,
                status,
                founder,
                founderReviewSummary,
                distanceMeters,
                null
        );
    }
}
