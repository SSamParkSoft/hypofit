package com.contentruck.hypofit.common.error;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ErrorDetail(
        @JsonProperty("code") String code,
        @JsonProperty("message") String message,
        @JsonProperty("status") int status,
        @JsonProperty("request_id") String requestId,
        @JsonProperty("debug_message") String debugMessage,
        @JsonProperty("field_errors") List<FieldError> fieldErrors
) {
}
