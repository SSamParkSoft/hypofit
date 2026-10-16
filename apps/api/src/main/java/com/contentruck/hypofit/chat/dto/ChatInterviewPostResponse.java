package com.contentruck.hypofit.chat.dto;

import com.contentruck.hypofit.chat.service.ChatInterviewPostSummary;
import com.contentruck.hypofit.interview.service.PostingCompensation;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ChatInterviewPostResponse(
        UUID id,
        @JsonProperty("founder_id")
        UUID founderId,
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
        @JsonProperty("duration_minutes")
        @Schema(minimum = "0")
        int durationMinutes,
        @JsonProperty("recruit_count")
        @Schema(minimum = "0", maximum = "999", defaultValue = "0")
        int recruitCount,
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
        @Schema(allowableValues = {"draft", "open", "closed", "completed", "archived", "hidden", "removed"})
        String status,
        ChatUserSummaryResponse founder,
        @JsonProperty("founder_review_summary")
        ChatFounderReviewSummaryResponse founderReviewSummary,
        @JsonProperty("distance_meters")
        Double distanceMeters,
        @JsonProperty("recruitment_type")
        String recruitmentType,
        @JsonProperty("entry_mode")
        String entryMode,
        List<PostingCompensation> compensations,
        @JsonProperty("duration_value")
        Integer durationValue,
        @JsonProperty("duration_unit")
        String durationUnit,
        @JsonProperty("beta_test_platforms")
        List<String> betaTestPlatforms,
        @JsonProperty("beta_test_starts_at")
        OffsetDateTime betaTestStartsAt,
        @JsonProperty("beta_test_ends_at")
        OffsetDateTime betaTestEndsAt
) {
    public static ChatInterviewPostResponse from(ChatInterviewPostSummary summary) {
        if (summary == null) {
            return null;
        }
        return new ChatInterviewPostResponse(
                summary.id(),
                summary.founderId(),
                summary.title(),
                summary.serviceSummary(),
                summary.targetDescription(),
                summary.rewardAmount(),
                summary.durationMinutes(),
                summary.recruitCount(),
                summary.interviewMode(),
                summary.location(),
                summary.locationText(),
                summary.locationAddress(),
                summary.locationPlaceName(),
                summary.locationLatitude(),
                summary.locationLongitude(),
                summary.locationPrecision(),
                summary.locationSource(),
                summary.scheduleOptions(),
                summary.status(),
                ChatUserSummaryResponse.from(summary.founder()),
                ChatFounderReviewSummaryResponse.from(summary.founderReviewSummary()),
                summary.distanceMeters(),
                summary.recruitmentType(),
                summary.entryMode(),
                summary.compensations(),
                summary.durationValue(),
                summary.durationUnit(),
                summary.betaTestPlatforms(),
                summary.betaTestStartsAt(),
                summary.betaTestEndsAt()
        );
    }
}
