package com.contentruck.hypofit.interview.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;
import com.contentruck.hypofit.interview.service.PostingCompensation;

@Schema(hidden = true)
public record InterviewPostCreateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public InterviewPostCreateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "InterviewPostCreate")
    public record OpenApiSchema(
            @JsonProperty("client_submission_id")
            @Schema(nullable = true, format = "uuid")
            java.util.UUID clientSubmissionId,
            @JsonProperty("recruitment_type")
            @Schema(defaultValue = "interview", allowableValues = {
                    "interview", "survey", "beta_test", "usability_test", "research_experiment", "focus_group", "other"
            })
            String recruitmentType,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 2, maxLength = 120)
            String title,
            @JsonProperty("service_summary")
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 10, maxLength = 2000)
            String serviceSummary,
            @JsonProperty("target_description")
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minLength = 10, maxLength = 2000)
            String targetDescription,
            @JsonProperty("reward_amount")
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0")
            Integer rewardAmount,
            List<PostingCompensation> compensations,
            @JsonProperty("duration_minutes")
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "10", maximum = "240")
            Integer durationMinutes,
            @JsonProperty("recruit_count")
            @Schema(defaultValue = "0", minimum = "0", maximum = "999")
            Integer recruitCount,
            @JsonProperty("interview_mode")
            @Schema(nullable = true, allowableValues = {"offline", "online", "both"})
            String interviewMode,
            @JsonProperty("entry_mode")
            @Schema(defaultValue = "application_required", allowableValues = {"application_required", "direct"})
            String entryMode,
            @JsonProperty("external_provider")
            @Schema(nullable = true, allowableValues = {"google_forms"})
            String externalProvider,
            @JsonProperty("external_url")
            @Schema(nullable = true, maxLength = 2000)
            String externalUrl,
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
            @Schema(nullable = true)
            String location,
            @JsonProperty("location_text")
            @Schema(nullable = true, maxLength = 200)
            String locationText,
            @JsonProperty("location_address")
            @Schema(nullable = true, maxLength = 300)
            String locationAddress,
            @JsonProperty("location_place_name")
            @Schema(nullable = true, maxLength = 200)
            String locationPlaceName,
            @JsonProperty("location_latitude")
            @Schema(nullable = true, minimum = "-90", maximum = "90")
            Double locationLatitude,
            @JsonProperty("location_longitude")
            @Schema(nullable = true, minimum = "-180", maximum = "180")
            Double locationLongitude,
            @JsonProperty("location_precision")
            @Schema(nullable = true, allowableValues = {"exact", "nearby", "district"})
            String locationPrecision,
            @JsonProperty("location_source")
            @Schema(nullable = true, allowableValues = {"kakao_place", "manual", "current_location"})
            String locationSource,
            @JsonProperty("schedule_options")
            @ArraySchema(schema = @Schema(type = "string"))
            List<String> scheduleOptions,
            @Schema(defaultValue = "draft", allowableValues = {"draft", "open"})
            String status
    ) {
    }
}
