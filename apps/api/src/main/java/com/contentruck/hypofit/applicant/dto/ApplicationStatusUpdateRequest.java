package com.contentruck.hypofit.applicant.dto;

import com.contentruck.hypofit.applicant.service.ApplicationValidationException;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;

@Schema(requiredProperties = {"status"})
public record ApplicationStatusUpdateRequest(
        @Schema(
                requiredMode = Schema.RequiredMode.REQUIRED,
                allowableValues = {"canceled", "rejected", "selected"}
        )
        String status,
        @JsonProperty("rejection_reason")
        @Schema(types = {"null", "string"}, minLength = 2, maxLength = 500)
        String rejectionReason
) {

    private static final Set<String> ALLOWED_STATUSES = Set.of("selected", "rejected", "canceled");

    public ValidatedStatusUpdate validateAndNormalize() {
        if (status == null || !ALLOWED_STATUSES.contains(status)) {
            throw new ApplicationValidationException("status must be one of selected, rejected, canceled");
        }
        if (rejectionReason != null && (rejectionReason.length() < 2 || rejectionReason.length() > 500)) {
            throw new ApplicationValidationException("rejection_reason length must be between 2 and 500");
        }
        String normalizedReason = rejectionReason == null ? null : rejectionReason.strip();
        if ("rejected".equals(status) && (normalizedReason == null || normalizedReason.isEmpty())) {
            throw new ApplicationValidationException("Rejection reason is required when status is rejected");
        }
        return new ValidatedStatusUpdate(status, normalizedReason);
    }

    public record ValidatedStatusUpdate(
            String status,
            String rejectionReason
    ) {
    }
}
