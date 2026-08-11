package com.contentruck.hypofit.chat.web;

import com.contentruck.hypofit.chat.domain.ChatApplicationSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ChatApplicationResponse(
        UUID id,
        @JsonProperty("interview_post_id")
        UUID interviewPostId,
        Map<String, String> answers,
        @JsonProperty("available_times")
        List<String> availableTimes,
        @JsonProperty("respondent_id")
        UUID respondentId,
        String status,
        @JsonProperty("rejection_reason")
        String rejectionReason,
        ChatUserSummaryResponse respondent
) {
    public static ChatApplicationResponse from(ChatApplicationSummary summary) {
        if (summary == null) {
            return null;
        }
        return new ChatApplicationResponse(
                summary.id(),
                summary.interviewPostId(),
                summary.answers(),
                summary.availableTimes(),
                summary.respondentId(),
                summary.status(),
                summary.rejectionReason(),
                ChatUserSummaryResponse.from(summary.respondent())
        );
    }
}
