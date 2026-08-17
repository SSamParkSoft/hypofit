package com.contentruck.hypofit.place.service;

import com.contentruck.hypofit.common.error.HypofitException;

public class PlaceSearchUnavailableException extends HypofitException {
    public PlaceSearchUnavailableException(String debugMessage) {
        super("service_unavailable", "지역 검색을 불러오지 못했어요.", 503, debugMessage);
    }
}
