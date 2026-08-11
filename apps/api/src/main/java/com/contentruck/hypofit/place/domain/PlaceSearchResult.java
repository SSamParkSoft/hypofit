package com.contentruck.hypofit.place.domain;

public record PlaceSearchResult(
        String id,
        String name,
        String address,
        String roadAddress,
        String category,
        String phone,
        double latitude,
        double longitude
) {
}
