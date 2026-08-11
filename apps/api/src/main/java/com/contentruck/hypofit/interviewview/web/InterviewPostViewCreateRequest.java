package com.contentruck.hypofit.interviewview.web;

import com.contentruck.hypofit.interviewview.domain.InterviewPostViewSource;
import jakarta.validation.constraints.NotNull;

public record InterviewPostViewCreateRequest(
        @NotNull InterviewPostViewSource source
) {
}
