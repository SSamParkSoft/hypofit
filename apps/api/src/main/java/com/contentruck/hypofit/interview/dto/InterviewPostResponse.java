package com.contentruck.hypofit.interview.dto;

import com.contentruck.hypofit.interview.service.InterviewPostReadModel;
import com.contentruck.hypofit.interview.service.PostingCompensation;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InterviewPostResponse(
        UUID id,
        @JsonProperty("founder_id")
        UUID founderId,
        @JsonProperty("recruitment_type")
        @Schema(allowableValues = {
                "interview", "survey", "beta_test", "usability_test", "research_experiment", "focus_group", "other"
        })
        String recruitmentType,
        @JsonProperty("entry_mode")
        @Schema(allowableValues = {"application_required", "direct"})
        String entryMode,
        String title,
        @JsonProperty("service_summary")
        @Schema(minLength = 10, maxLength = 2000)
        String serviceSummary,
        @JsonProperty("target_description")
        @Schema(minLength = 10, maxLength = 2000)
        String targetDescription,
        @JsonProperty("reward_amount")
        @Schema(minimum = "0")
        int rewardAmount,
        List<PostingCompensation> compensations,
        @JsonProperty("duration_minutes")
        @Schema(minimum = "10", maximum = "240")
        int durationMinutes,
        @JsonProperty("recruit_count")
        @Schema(minimum = "0", maximum = "999", defaultValue = "0")
        int recruitCount,
        @JsonProperty("external_provider")
        @Schema(nullable = true, allowableValues = {"google_forms"})
        String externalProvider,
        @JsonProperty("external_url")
        @Schema(nullable = true, maxLength = 2000)
        String externalUrl,
        @JsonProperty("external_action_available")
        boolean externalActionAvailable,
        @JsonProperty("participation_deadline_at")
        @Schema(nullable = true)
        OffsetDateTime participationDeadlineAt,
        @JsonProperty("external_data_notice")
        @Schema(nullable = true, maxLength = 2000)
        String externalDataNotice,
        @JsonProperty("beta_test_platforms")
        @ArraySchema(schema = @Schema(type = "string"))
        List<String> betaTestPlatforms,
        @JsonProperty("beta_test_starts_at")
        @Schema(nullable = true)
        OffsetDateTime betaTestStartsAt,
        @JsonProperty("beta_test_ends_at")
        @Schema(nullable = true)
        OffsetDateTime betaTestEndsAt,
        @JsonProperty("interview_mode")
        @Schema(allowableValues = {"offline", "online", "both"})
        String interviewMode,
        String location,
        @JsonProperty("location_text")
        @Schema(maxLength = 200)
        String locationText,
        @JsonProperty("location_address")
        @Schema(maxLength = 300)
        String locationAddress,
        @JsonProperty("location_place_name")
        @Schema(maxLength = 200)
        String locationPlaceName,
        @JsonProperty("location_latitude")
        @Schema(minimum = "-90", maximum = "90")
        Double locationLatitude,
        @JsonProperty("location_longitude")
        @Schema(minimum = "-180", maximum = "180")
        Double locationLongitude,
        @JsonProperty("location_precision")
        @Schema(allowableValues = {"district", "exact", "nearby"})
        String locationPrecision,
        @JsonProperty("location_source")
        @Schema(allowableValues = {"current_location", "kakao_place", "manual"})
        String locationSource,
        @JsonProperty("schedule_options")
        List<String> scheduleOptions,
        @Schema(allowableValues = {
                "draft", "open", "closed", "completed", "archived", "hidden", "removed"
        })
        String status,
        @JsonProperty("created_at")
        OffsetDateTime createdAt,
        FounderSummaryResponse founder,
        @JsonProperty("founder_review_summary")
        FounderReviewSummaryResponse founderReviewSummary,
        @JsonProperty("distance_meters")
        Double distanceMeters,
        @JsonProperty("ai_summary")
        InterviewAiSummaryResponse aiSummary
) {

    public static InterviewPostResponse from(InterviewPostReadModel model) {
        return new InterviewPostResponse(
                model.id(),
                model.founderId(),
                model.recruitmentType(),
                model.entryMode(),
                model.title(),
                model.serviceSummary(),
                model.targetDescription(),
                model.rewardAmount(),
                model.compensations(),
                model.durationMinutes(),
                model.recruitCount(),
                model.externalProvider(),
                null,
                "survey".equals(model.recruitmentType())
                        && model.externalUrl() != null
                        && !model.externalUrl().isBlank(),
                model.participationDeadlineAt(),
                model.externalDataNotice(),
                model.betaTestPlatforms(),
                model.betaTestStartsAt(),
                model.betaTestEndsAt(),
                model.interviewMode(),
                model.location(),
                model.locationText(),
                model.locationAddress(),
                model.locationPlaceName(),
                model.locationLatitude(),
                model.locationLongitude(),
                model.locationPrecision(),
                model.locationSource(),
                model.scheduleOptions(),
                model.status(),
                model.createdAt(),
                FounderSummaryResponse.from(model.founder()),
                FounderReviewSummaryResponse.from(model.founderReviewSummary()),
                model.distanceMeters(),
                InterviewAiSummaryResponse.from(model.aiSummary())
        );
    }
}
