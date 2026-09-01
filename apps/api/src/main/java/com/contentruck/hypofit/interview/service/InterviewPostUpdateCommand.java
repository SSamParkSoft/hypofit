package com.contentruck.hypofit.interview.service;

import java.time.OffsetDateTime;
import java.util.Set;

public record InterviewPostUpdateCommand(
        Set<String> providedFields,
        String recruitmentType,
        String title,
        String serviceSummary,
        String targetDescription,
        Integer rewardAmount,
        Integer durationMinutes,
        Integer recruitCount,
        String externalProvider,
        String externalUrl,
        OffsetDateTime participationDeadlineAt,
        String externalDataNotice,
        java.util.List<String> betaTestPlatforms,
        OffsetDateTime betaTestStartsAt,
        OffsetDateTime betaTestEndsAt,
        String interviewMode,
        String location,
        String locationText,
        String locationAddress,
        String locationPlaceName,
        Double locationLatitude,
        Double locationLongitude,
        String locationPrecision,
        String locationSource,
        java.util.List<String> scheduleOptions,
        String status,
        String entryMode
) {
    public InterviewPostUpdateCommand(
            Set<String> providedFields,
            String recruitmentType,
            String title,
            String serviceSummary,
            String targetDescription,
            Integer rewardAmount,
            Integer durationMinutes,
            Integer recruitCount,
            String interviewMode,
            String location,
            String locationText,
            String locationAddress,
            String locationPlaceName,
            Double locationLatitude,
            Double locationLongitude,
            String locationPrecision,
            String locationSource,
            java.util.List<String> scheduleOptions,
            String status
    ) {
        this(
                providedFields,
                recruitmentType,
                title,
                serviceSummary,
                targetDescription,
                rewardAmount,
                durationMinutes,
                recruitCount,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
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
                null
        );
    }

    public boolean hasField(String fieldName) {
        return providedFields.contains(fieldName);
    }
}
