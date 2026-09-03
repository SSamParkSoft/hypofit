package com.contentruck.hypofit.interview.service;

import java.time.OffsetDateTime;
import java.util.List;

public record InterviewPostCreateCommand(
        String recruitmentType,
        String title,
        String serviceSummary,
        String targetDescription,
        int rewardAmount,
        List<PostingCompensation> compensations,
        int durationMinutes,
        int recruitCount,
        String externalProvider,
        String externalUrl,
        OffsetDateTime participationDeadlineAt,
        String externalDataNotice,
        List<String> betaTestPlatforms,
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
        List<String> scheduleOptions,
        String status,
        String entryMode,
        List<String> participantRequirements,
        PostingCreationConfiguration creationConfiguration
) {
    public InterviewPostCreateCommand(
            String recruitmentType, String title, String serviceSummary, String targetDescription,
            int rewardAmount, List<PostingCompensation> compensations, int durationMinutes, int recruitCount,
            String externalProvider, String externalUrl, OffsetDateTime participationDeadlineAt,
            String externalDataNotice, List<String> betaTestPlatforms, OffsetDateTime betaTestStartsAt,
            OffsetDateTime betaTestEndsAt, String interviewMode, String location, String locationText,
            String locationAddress, String locationPlaceName, Double locationLatitude, Double locationLongitude,
            String locationPrecision, String locationSource, List<String> scheduleOptions, String status,
            String entryMode
    ) {
        this(recruitmentType, title, serviceSummary, targetDescription, rewardAmount, compensations,
                durationMinutes, recruitCount, externalProvider, externalUrl, participationDeadlineAt,
                externalDataNotice, betaTestPlatforms, betaTestStartsAt, betaTestEndsAt, interviewMode,
                location, locationText, locationAddress, locationPlaceName, locationLatitude, locationLongitude,
                locationPrecision, locationSource, scheduleOptions, status, entryMode, List.of(),
                PostingCreationConfiguration.empty());
    }

    public InterviewPostCreateCommand(
            String recruitmentType, String title, String serviceSummary, String targetDescription,
            int rewardAmount, List<PostingCompensation> compensations, int durationMinutes, int recruitCount,
            String externalProvider, String externalUrl, OffsetDateTime participationDeadlineAt,
            String externalDataNotice, List<String> betaTestPlatforms, OffsetDateTime betaTestStartsAt,
            OffsetDateTime betaTestEndsAt, String interviewMode, String location, String locationText,
            String locationAddress, String locationPlaceName, Double locationLatitude, Double locationLongitude,
            String locationPrecision, String locationSource, List<String> scheduleOptions, String status
    ) {
        this(recruitmentType, title, serviceSummary, targetDescription, rewardAmount, compensations,
                durationMinutes, recruitCount, externalProvider, externalUrl, participationDeadlineAt,
                externalDataNotice, betaTestPlatforms, betaTestStartsAt, betaTestEndsAt, interviewMode,
                location, locationText, locationAddress, locationPlaceName, locationLatitude, locationLongitude,
                locationPrecision, locationSource, scheduleOptions, status, "application_required", List.of(),
                PostingCreationConfiguration.empty());
    }
    public InterviewPostCreateCommand(
            String recruitmentType,
            String title,
            String serviceSummary,
            String targetDescription,
            int rewardAmount,
            int durationMinutes,
            int recruitCount,
            String externalProvider,
            String externalUrl,
            OffsetDateTime participationDeadlineAt,
            String externalDataNotice,
            List<String> betaTestPlatforms,
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
            List<String> scheduleOptions,
            String status
    ) {
        this(
                recruitmentType, title, serviceSummary, targetDescription, rewardAmount,
                PostingCompensations.legacy(rewardAmount), durationMinutes, recruitCount,
                externalProvider, externalUrl, participationDeadlineAt, externalDataNotice,
                betaTestPlatforms, betaTestStartsAt, betaTestEndsAt, interviewMode, location,
                locationText, locationAddress, locationPlaceName, locationLatitude,
                locationLongitude, locationPrecision, locationSource, scheduleOptions, status,
                "application_required",
                List.of(),
                PostingCreationConfiguration.empty()
        );
    }

    public InterviewPostCreateCommand(
            String recruitmentType,
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
            String status
    ) {
        this(
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
                status
        );
    }
}
