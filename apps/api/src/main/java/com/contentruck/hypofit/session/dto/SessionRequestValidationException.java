package com.contentruck.hypofit.session.dto;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import java.util.List;

public class SessionRequestValidationException extends HypofitValidationException {

    SessionRequestValidationException(List<SessionValidationIssue> issues) {
        super(
                "Session request validation failed.",
                issues.stream().map(issue -> new FieldError(issue.field(), issue.message())).toList()
        );
    }
}
