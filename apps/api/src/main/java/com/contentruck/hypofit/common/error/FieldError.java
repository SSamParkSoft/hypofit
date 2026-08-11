package com.contentruck.hypofit.common.error;

import com.fasterxml.jackson.annotation.JsonProperty;

public record FieldError(
        @JsonProperty("field") String field,
        @JsonProperty("message") String message,
        @JsonProperty("code") String code
) {

    public FieldError(String field, String message) {
        this(field, message, "validation_error");
    }
}
