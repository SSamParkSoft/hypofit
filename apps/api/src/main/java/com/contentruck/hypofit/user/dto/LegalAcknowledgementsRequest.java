package com.contentruck.hypofit.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record LegalAcknowledgementsRequest(
        @NotBlank @Size(max = 100) String documentRevision,
        @NotBlank @Size(max = 16) String documentStatus,
        @NotBlank @Size(max = 16) String action,
        @NotBlank @Size(max = 32) String source,
        @NotNull @AssertTrue Boolean termsAccepted,
        @NotNull @AssertTrue Boolean privacyNoticeAcknowledged,
        @JsonProperty("age_19_confirmed") @NotNull @AssertTrue Boolean age19Confirmed
) {
}
