package com.contentruck.hypofit.chat.dto;

import com.contentruck.hypofit.chat.service.ChatWorkflowActionReadModel;
import com.contentruck.hypofit.chat.service.ChatWorkflowReadModel;
import com.contentruck.hypofit.session.service.SessionReadModels;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ChatWorkflowResponse(
        @Schema(allowableValues = {
                "application_review",
                "selected",
                "schedule_needed",
                "scheduled",
                "attendance_confirmation_needed",
                "attendance_counterpart_pending",
                "completed",
                "reward_payment_needed",
                "reward_confirmation_needed",
                "reward_confirmed",
                "review_needed",
                "closed",
                "problem_reported"
        })
        String step,
        String title,
        String description,
        ChatWorkflowActionResponse primaryAction,
        ChatWorkflowActionResponse secondaryAction,
        ChatWorkflowActionResponse dangerAction,
        ChatWorkflowSessionResponse session,
        ChatWorkflowAttendanceResponse attendance,
        ChatWorkflowRewardResponse reward,
        ChatWorkflowReviewResponse myReview,
        @Schema(defaultValue = "false")
        boolean counterpartReviewSubmitted
) {
    public static ChatWorkflowResponse from(ChatWorkflowReadModel model) {
        return new ChatWorkflowResponse(
                model.step(),
                model.title(),
                model.description(),
                ChatWorkflowActionResponse.from(model.primaryAction()),
                ChatWorkflowActionResponse.from(model.secondaryAction()),
                ChatWorkflowActionResponse.from(model.dangerAction()),
                ChatWorkflowSessionResponse.from(model.session()),
                ChatWorkflowAttendanceResponse.from(model.attendance()),
                ChatWorkflowRewardResponse.from(model.reward()),
                ChatWorkflowReviewResponse.from(model.myReview()),
                model.counterpartReviewSubmitted()
        );
    }
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
record ChatWorkflowActionResponse(
        @Schema(allowableValues = {
                "open_application_answers",
                "select_application",
                "reject_application",
                "create_schedule",
                "confirm_attendance",
                "mark_no_show",
                "mark_reward_paid",
                "confirm_reward_received",
                "dispute_reward",
                "write_review",
                "open_support_report"
        })
        String action,
        String label,
        @Schema(
                allowableValues = {"default", "primary", "danger"},
                defaultValue = "default"
        )
        String tone
) {
    static ChatWorkflowActionResponse from(ChatWorkflowActionReadModel model) {
        if (model == null) {
            return null;
        }
        return new ChatWorkflowActionResponse(model.action(), model.label(), model.tone());
    }
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
record ChatWorkflowUserSummaryResponse(
        UUID id,
        String name,
        String bio,
        String role,
        String profileImageUrl
) {
    static ChatWorkflowUserSummaryResponse from(SessionReadModels.UserSummary model) {
        if (model == null) {
            return null;
        }
        return new ChatWorkflowUserSummaryResponse(
                model.id(),
                model.name(),
                model.bio(),
                model.role(),
                model.profileImageUrl()
        );
    }
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
record ChatWorkflowApplicationResponse(
        UUID id,
        UUID interviewPostId,
        Map<String, String> answers,
        List<String> availableTimes,
        UUID respondentId,
        String status,
        String rejectionReason,
        ChatWorkflowUserSummaryResponse respondent
) {
    static ChatWorkflowApplicationResponse from(SessionReadModels.ApplicationReadModel model) {
        if (model == null) {
            return null;
        }
        return new ChatWorkflowApplicationResponse(
                model.id(),
                model.interviewPostId(),
                model.answers(),
                model.availableTimes(),
                model.respondentId(),
                model.status(),
                model.rejectionReason(),
                ChatWorkflowUserSummaryResponse.from(model.respondent())
        );
    }
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
record ChatWorkflowSessionResponse(
        UUID id,
        UUID applicationId,
        OffsetDateTime scheduledAt,
        @Schema(allowableValues = {"offline", "online"})
        String meetingType,
        String meetingUrl,
        String place,
        String status,
        ChatWorkflowApplicationResponse application
) {
    static ChatWorkflowSessionResponse from(SessionReadModels.InterviewSessionReadModel model) {
        if (model == null) {
            return null;
        }
        return new ChatWorkflowSessionResponse(
                model.id(),
                model.applicationId(),
                model.scheduledAt(),
                model.meetingType(),
                model.meetingUrl(),
                model.place(),
                model.status(),
                ChatWorkflowApplicationResponse.from(model.application())
        );
    }
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
record ChatWorkflowAttendanceResponse(
        UUID sessionId,
        boolean founderConfirmed,
        boolean respondentConfirmed,
        OffsetDateTime founderConfirmedAt,
        OffsetDateTime respondentConfirmedAt,
        OffsetDateTime completedAt,
        String noShowParty
) {
    static ChatWorkflowAttendanceResponse from(SessionReadModels.AttendanceRecordReadModel model) {
        if (model == null) {
            return null;
        }
        return new ChatWorkflowAttendanceResponse(
                model.sessionId(),
                model.founderConfirmed(),
                model.respondentConfirmed(),
                model.founderConfirmedAt(),
                model.respondentConfirmedAt(),
                model.completedAt(),
                model.noShowParty()
        );
    }
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
record ChatWorkflowRewardResponse(
        UUID id,
        UUID sessionId,
        UUID applicationId,
        UUID founderId,
        UUID respondentId,
        int amount,
        @Schema(allowableValues = {
                "canceled",
                "disputed",
                "founder_marked_paid",
                "pending",
                "respondent_confirmed"
        })
        String status,
        OffsetDateTime founderMarkedPaidAt,
        OffsetDateTime respondentConfirmedAt,
        OffsetDateTime disputedAt,
        String disputeReason,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    static ChatWorkflowRewardResponse from(SessionReadModels.RewardConfirmationReadModel model) {
        if (model == null) {
            return null;
        }
        return new ChatWorkflowRewardResponse(
                model.id(),
                model.sessionId(),
                model.applicationId(),
                model.founderId(),
                model.respondentId(),
                model.amount(),
                model.status(),
                model.founderMarkedPaidAt(),
                model.respondentConfirmedAt(),
                model.disputedAt(),
                model.disputeReason(),
                model.createdAt(),
                model.updatedAt()
        );
    }
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
record ChatWorkflowReviewResponse(
        UUID id,
        UUID sessionId,
        UUID reviewerId,
        UUID revieweeId,
        @Schema(allowableValues = {"founder", "respondent"})
        String reviewerRole,
        int rating,
        List<String> tags,
        String comment,
        String visibility,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    static ChatWorkflowReviewResponse from(SessionReadModels.InterviewReviewReadModel model) {
        if (model == null) {
            return null;
        }
        return new ChatWorkflowReviewResponse(
                model.id(),
                model.sessionId(),
                model.reviewerId(),
                model.revieweeId(),
                model.reviewerRole(),
                model.rating(),
                model.tags(),
                model.comment(),
                model.visibility(),
                model.createdAt(),
                model.updatedAt()
        );
    }
}
