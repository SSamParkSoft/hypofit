package com.contentruck.hypofit.interview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * The mobile create flow reads this before offering a recruitment type. These
 * values deliberately come from the same service that guards writes.
 */
public record InterviewPostCreationCapabilitiesResponse(
        @JsonProperty("enabled_recruitment_types")
        List<String> enabledRecruitmentTypes,
        @JsonProperty("direct_participation_recruitment_types")
        List<String> directParticipationRecruitmentTypes
) {
}
