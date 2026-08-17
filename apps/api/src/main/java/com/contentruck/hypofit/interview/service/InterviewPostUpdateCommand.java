package com.contentruck.hypofit.interview.service;

import java.util.Set;

public record InterviewPostUpdateCommand(
        Set<String> providedFields,
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
    public boolean hasField(String fieldName) {
        return providedFields.contains(fieldName);
    }
}
