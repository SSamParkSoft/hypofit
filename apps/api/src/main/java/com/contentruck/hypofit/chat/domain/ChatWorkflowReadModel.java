package com.contentruck.hypofit.chat.domain;

import com.contentruck.hypofit.session.application.SessionReadModels;

public record ChatWorkflowReadModel(
        String step,
        String title,
        String description,
        ChatWorkflowActionReadModel primaryAction,
        ChatWorkflowActionReadModel secondaryAction,
        ChatWorkflowActionReadModel dangerAction,
        SessionReadModels.InterviewSessionReadModel session,
        SessionReadModels.AttendanceRecordReadModel attendance,
        SessionReadModels.RewardConfirmationReadModel reward,
        SessionReadModels.InterviewReviewReadModel myReview,
        boolean counterpartReviewSubmitted
) {
}
