package com.contentruck.hypofit.chat.service;

public record ChatWorkflowReadModel(
        String step,
        String title,
        String description,
        ChatWorkflowActionReadModel primaryAction,
        ChatWorkflowActionReadModel secondaryAction,
        ChatWorkflowActionReadModel dangerAction,
        ChatWorkflowModels.InterviewSessionReadModel session,
        ChatWorkflowModels.AttendanceRecordReadModel attendance,
        ChatWorkflowModels.RewardConfirmationReadModel reward,
        ChatWorkflowModels.InterviewReviewReadModel myReview,
        boolean counterpartReviewSubmitted
) {
}
