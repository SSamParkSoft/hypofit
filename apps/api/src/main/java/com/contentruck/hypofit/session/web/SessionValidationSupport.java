package com.contentruck.hypofit.session.web;

import com.contentruck.hypofit.common.error.FieldError;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import java.util.List;

record SessionValidationIssue(String field, String message) {
}

class SessionRequestValidationException extends HypofitValidationException {

    SessionRequestValidationException(List<SessionValidationIssue> issues) {
        super(
                "Session request validation failed.",
                issues.stream().map(issue -> new FieldError(issue.field(), issue.message())).toList()
        );
    }
}
