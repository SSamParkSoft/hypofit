package com.contentruck.hypofit.interview.service;

import java.time.OffsetDateTime;
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
        OffsetDateTime createdAt,
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
            OffsetDateTime createdAt,
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
                createdAt,
                founder,
                founderReviewSummary,
                distanceMeters,
                null
        );
    }
}
