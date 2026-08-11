package com.contentruck.hypofit.interview.application;

import java.util.List;

public record InterviewPostCreateCommand(
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
}
