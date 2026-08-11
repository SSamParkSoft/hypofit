package com.contentruck.hypofit.common.error;

import java.util.List;

public class HypofitValidationException extends HypofitException {

    private final List<FieldError> fieldErrors;

    public HypofitValidationException(String debugMessage, List<FieldError> fieldErrors) {
        super("validation_failed", "입력값을 확인해 주세요.", 422, debugMessage);
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public List<FieldError> getFieldErrors() {
        return fieldErrors;
    }
}
