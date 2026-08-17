package com.contentruck.hypofit.interview.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InterviewPostWriteModel(
        UUID id,
        UUID founderId,
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
        List<String> scheduleOptions,
        String status,
        OffsetDateTime createdAt
) {
}
