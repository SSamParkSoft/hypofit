package com.contentruck.hypofit.interview.web;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(hidden = true)
public record InterviewPostUpdateRequest(Object rawBody) {

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public InterviewPostUpdateRequest(Object rawBody) {
        this.rawBody = rawBody;
    }

    @Schema(name = "InterviewPostUpdate")
    public record OpenApiSchema(
            @Schema(nullable = true, minLength = 2, maxLength = 120)
            String title,
            @JsonProperty("service_summary")
            @Schema(nullable = true, minLength = 10, maxLength = 2000)
            String serviceSummary,
            @JsonProperty("target_description")
            @Schema(nullable = true, minLength = 10, maxLength = 2000)
            String targetDescription,
            @JsonProperty("reward_amount")
            @Schema(nullable = true, minimum = "0")
            Integer rewardAmount,
            @JsonProperty("duration_minutes")
            @Schema(nullable = true, minimum = "10", maximum = "240")
            Integer durationMinutes,
            @JsonProperty("recruit_count")
            @Schema(nullable = true, minimum = "0", maximum = "999")
            Integer recruitCount,
            @JsonProperty("interview_mode")
            @Schema(nullable = true, allowableValues = {"offline", "online", "both"})
            String interviewMode,
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
            @Schema(nullable = true, allowableValues = {"draft", "open"})
            String status
    ) {
    }
}
