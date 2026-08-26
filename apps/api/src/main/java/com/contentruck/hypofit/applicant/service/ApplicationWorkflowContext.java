package com.contentruck.hypofit.applicant.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ApplicationWorkflowContext(
        UUID applicationId,
        UUID interviewPostId,
        String interviewTitle,
        String recruitmentType,
        UUID founderId,
        UUID respondentId,
        Map<String, String> answers,
        List<String> availableTimes,
        String status,
        String rejectionReason
) {
}
