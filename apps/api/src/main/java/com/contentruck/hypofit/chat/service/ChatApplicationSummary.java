package com.contentruck.hypofit.chat.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.OffsetDateTime;

public record ChatApplicationSummary(
        UUID id,
        UUID interviewPostId,
        Map<String, String> answers,
        List<String> availableTimes,
        UUID respondentId,
        String status,
        String rejectionReason,
        ChatUserSummary respondent,
        OffsetDateTime sharingWithdrawnAt
) {
    public ChatApplicationSummary(UUID id, UUID interviewPostId, Map<String, String> answers,
                                  List<String> availableTimes, UUID respondentId, String status,
                                  String rejectionReason, ChatUserSummary respondent) {
        this(id, interviewPostId, answers, availableTimes, respondentId, status, rejectionReason, respondent, null);
    }
}
