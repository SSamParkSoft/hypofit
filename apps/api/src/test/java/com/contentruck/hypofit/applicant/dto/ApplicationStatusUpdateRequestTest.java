package com.contentruck.hypofit.applicant.dto;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.applicant.service.ApplicationValidationException;
import org.junit.jupiter.api.Test;

class ApplicationStatusUpdateRequestTest {

    @Test
    void validateAndNormalizeRequiresReasonForRejectedStatus() {
        ApplicationStatusUpdateRequest request = new ApplicationStatusUpdateRequest("rejected", "   ");

        assertThatThrownBy(request::validateAndNormalize)
                .isInstanceOf(ApplicationValidationException.class)
                .hasMessageContaining("Rejection reason is required when status is rejected");
    }

    @Test
    void validateAndNormalizeRejectsUnsupportedStatus() {
        ApplicationStatusUpdateRequest request = new ApplicationStatusUpdateRequest("completed", null);

        assertThatThrownBy(request::validateAndNormalize)
                .isInstanceOf(ApplicationValidationException.class)
                .hasMessageContaining("status must be one of selected, rejected, canceled");
    }

    @Test
    void validateAndNormalizeStripsReason() {
        ApplicationStatusUpdateRequest request = new ApplicationStatusUpdateRequest("rejected", " 일정이 맞지 않아요 ");

        ApplicationStatusUpdateRequest.ValidatedStatusUpdate result = request.validateAndNormalize();

        assertThat(result.status()).isEqualTo("rejected");
        assertThat(result.rejectionReason()).isEqualTo("일정이 맞지 않아요");
    }
}
