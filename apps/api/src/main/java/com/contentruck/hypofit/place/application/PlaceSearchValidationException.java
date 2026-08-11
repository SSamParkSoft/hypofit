package com.contentruck.hypofit.place.application;

import com.contentruck.hypofit.common.error.HypofitException;

public class PlaceSearchValidationException extends HypofitException {
    public PlaceSearchValidationException(String debugMessage) {
        super("validation_failed", "입력값을 확인해 주세요.", 422, debugMessage);
    }
}
