package com.contentruck.hypofit.interviewview.dto;

import com.contentruck.hypofit.interviewview.service.InterviewPostViewSource;
import jakarta.validation.constraints.NotNull;

public record InterviewPostViewCreateRequest(
        @NotNull InterviewPostViewSource source
) {
}
