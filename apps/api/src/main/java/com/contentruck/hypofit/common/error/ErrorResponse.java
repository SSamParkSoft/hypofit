package com.contentruck.hypofit.common.error;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ErrorResponse(
        @JsonProperty("error") ErrorDetail error
) {
}
