package com.contentruck.hypofit.session.web;

import com.contentruck.hypofit.session.application.SessionReadModels;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

final class SessionWebModels {

    private SessionWebModels() {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record CreateSessionRequest(
            @JsonProperty("application_id") @NotNull UUID applicationId,
            @JsonProperty("scheduled_at") @NotNull OffsetDateTime scheduledAt,
            @JsonProperty("meeting_type")
            @NotBlank
            @Pattern(regexp = "offline|online")
            @Schema(allowableValues = {"offline", "online"})
            String meetingType,
            @JsonProperty("meeting_url")
            @Size(max = 500)
            @Schema(types = {"null", "string"})
            String meetingUrl,
            @Size(max = 300)
            @Schema(types = {"null", "string"})
            String place
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    static final class UpdateSessionRequest {

        @Pattern(regexp = "offline|online")
        @Size(max = 20)
        @Schema(types = {"null", "string"}, allowableValues = {"offline", "online"})
        private String meetingType;

        @Size(max = 500)
        @Schema(types = {"null", "string"})
        private String meetingUrl;

        @Size(max = 300)
        @Schema(types = {"null", "string"})
        private String place;

        @Size(max = 500)
        @Schema(types = {"null", "string"})
        private String reason;

        @Schema(types = {"null", "string"}, format = "date-time")
        private OffsetDateTime scheduledAt;
        private boolean scheduledAtPresent;
        private boolean meetingTypePresent;
        private boolean meetingUrlPresent;
        private boolean placePresent;

        @JsonProperty("scheduled_at")
        public OffsetDateTime getScheduledAt() {
            return scheduledAt;
        }

        @JsonProperty("scheduled_at")
        public void setScheduledAt(OffsetDateTime scheduledAt) {
            this.scheduledAt = scheduledAt;
            this.scheduledAtPresent = true;
        }

        @JsonProperty("meeting_type")
        public String getMeetingType() {
            return meetingType;
        }

        @JsonProperty("meeting_type")
        public void setMeetingType(String meetingType) {
            this.meetingType = meetingType;
            this.meetingTypePresent = true;
        }

        @JsonProperty("meeting_url")
        public String getMeetingUrl() {
            return meetingUrl;
        }

        @JsonProperty("meeting_url")
        public void setMeetingUrl(String meetingUrl) {
            this.meetingUrl = meetingUrl;
            this.meetingUrlPresent = true;
        }

        public String getPlace() {
            return place;
        }

        public void setPlace(String place) {
            this.place = place;
            this.placePresent = true;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }

        @JsonIgnore
        public boolean isScheduledAtPresent() {
            return scheduledAtPresent;
        }

        @JsonIgnore
        public boolean isMeetingTypePresent() {
            return meetingTypePresent;
        }

        @JsonIgnore
        public boolean isMeetingUrlPresent() {
            return meetingUrlPresent;
        }

        @JsonIgnore
        public boolean isPlacePresent() {
            return placePresent;
        }

        public void validateForPatch() {
            List<SessionValidationIssue> issues = new ArrayList<>();
            if (!scheduledAtPresent && !meetingTypePresent && !meetingUrlPresent && !placePresent) {
                issues.add(new SessionValidationIssue("__root__", "At least one session field must be provided"));
            }
            if (scheduledAtPresent && scheduledAt == null) {
                issues.add(new SessionValidationIssue("scheduled_at", "scheduled_at cannot be null"));
            }
            if (meetingTypePresent && meetingType == null) {
                issues.add(new SessionValidationIssue("meeting_type", "meeting_type cannot be null"));
            }
            if (!issues.isEmpty()) {
                throw new SessionRequestValidationException(issues);
            }
        }
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record RewardDisputeRequest(
            @Schema(types = {"null", "string"})
            @Size(max = 500) String reason
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record ReviewCreateRequest(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            @Min(1) @Max(5) int rating,
            @Size(max = 6) List<String> tags,
            @Schema(types = {"null", "string"})
            @Size(max = 500) String comment
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record CancelSessionRequest(
            @Schema(types = {"null", "string"})
            @Size(max = 500) String reason
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record NoShowRequest(
            @Schema(types = {"null", "string"}, allowableValues = {"founder", "respondent"})
            @JsonProperty("no_show_party")
            @Pattern(regexp = "founder|respondent") String noShowParty
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record UserSummaryResponse(
            UUID id,
            String name,
            String bio,
            String role,
            @JsonProperty("profile_image_url") String profileImageUrl
    ) {
        static UserSummaryResponse from(SessionReadModels.UserSummary summary) {
            if (summary == null) {
                return null;
            }
            return new UserSummaryResponse(
                    summary.id(),
                    summary.name(),
                    summary.bio(),
                    summary.role(),
                    summary.profileImageUrl()
            );
        }
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    @Schema(name = "SessionApplicationResponse")
    record ApplicationResponse(
            UUID id,
            @JsonProperty("interview_post_id") UUID interviewPostId,
            Map<String, String> answers,
            @JsonProperty("available_times") List<String> availableTimes,
            @JsonProperty("respondent_id") UUID respondentId,
            String status,
            @JsonProperty("rejection_reason") String rejectionReason,
            UserSummaryResponse respondent
    ) {
        static ApplicationResponse from(SessionReadModels.ApplicationReadModel application) {
            if (application == null) {
                return null;
            }
            return new ApplicationResponse(
                    application.id(),
                    application.interviewPostId(),
                    application.answers(),
                    application.availableTimes(),
                    application.respondentId(),
                    application.status(),
                    application.rejectionReason(),
                    UserSummaryResponse.from(application.respondent())
            );
        }
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record InterviewSessionResponse(
            UUID id,
            @JsonProperty("application_id") UUID applicationId,
            @JsonProperty("scheduled_at") OffsetDateTime scheduledAt,
            @JsonProperty("meeting_type")
            @Schema(allowableValues = {"offline", "online"})
            String meetingType,
            @JsonProperty("meeting_url") String meetingUrl,
            String place,
            String status,
            ApplicationResponse application
    ) {
        static InterviewSessionResponse from(SessionReadModels.InterviewSessionReadModel model) {
            return new InterviewSessionResponse(
                    model.id(),
                    model.applicationId(),
                    model.scheduledAt(),
                    model.meetingType(),
                    model.meetingUrl(),
                    model.place(),
                    model.status(),
                    ApplicationResponse.from(model.application())
            );
        }
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record AttendanceRecordResponse(
            @JsonProperty("session_id") UUID sessionId,
            @JsonProperty("founder_confirmed") boolean founderConfirmed,
            @JsonProperty("respondent_confirmed") boolean respondentConfirmed,
            @JsonProperty("founder_confirmed_at") OffsetDateTime founderConfirmedAt,
            @JsonProperty("respondent_confirmed_at") OffsetDateTime respondentConfirmedAt,
            @JsonProperty("completed_at") OffsetDateTime completedAt,
            @JsonProperty("no_show_party") String noShowParty
    ) {
        static AttendanceRecordResponse from(SessionReadModels.AttendanceRecordReadModel model) {
            return new AttendanceRecordResponse(
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
    record ConfirmAttendanceResponse(
            InterviewSessionResponse session,
            AttendanceRecordResponse attendance
    ) {
        static ConfirmAttendanceResponse from(SessionReadModels.ConfirmAttendanceReadModel model) {
            return new ConfirmAttendanceResponse(
                    InterviewSessionResponse.from(model.session()),
                    AttendanceRecordResponse.from(model.attendance())
            );
        }
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record RewardConfirmationResponse(
            UUID id,
            @JsonProperty("session_id") UUID sessionId,
            @JsonProperty("application_id") UUID applicationId,
            @JsonProperty("founder_id") UUID founderId,
            @JsonProperty("respondent_id") UUID respondentId,
            int amount,
            @Schema(allowableValues = {
                    "canceled",
                    "disputed",
                    "founder_marked_paid",
                    "pending",
                    "respondent_confirmed"
            })
            String status,
            @JsonProperty("founder_marked_paid_at") OffsetDateTime founderMarkedPaidAt,
            @JsonProperty("respondent_confirmed_at") OffsetDateTime respondentConfirmedAt,
            @JsonProperty("disputed_at") OffsetDateTime disputedAt,
            @JsonProperty("dispute_reason") String disputeReason,
            @JsonProperty("created_at") OffsetDateTime createdAt,
            @JsonProperty("updated_at") OffsetDateTime updatedAt
    ) {
        static RewardConfirmationResponse from(SessionReadModels.RewardConfirmationReadModel model) {
            return new RewardConfirmationResponse(
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
    record InterviewReviewResponse(
            UUID id,
            @JsonProperty("session_id") UUID sessionId,
            @JsonProperty("reviewer_id") UUID reviewerId,
            @JsonProperty("reviewee_id") UUID revieweeId,
            @JsonProperty("reviewer_role")
            @Schema(allowableValues = {"founder", "respondent"})
            String reviewerRole,
            int rating,
            List<String> tags,
            String comment,
            String visibility,
            @JsonProperty("created_at") OffsetDateTime createdAt,
            @JsonProperty("updated_at") OffsetDateTime updatedAt
    ) {
        static InterviewReviewResponse from(SessionReadModels.InterviewReviewReadModel model) {
            return new InterviewReviewResponse(
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
}
