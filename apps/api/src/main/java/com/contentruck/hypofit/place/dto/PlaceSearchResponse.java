package com.contentruck.hypofit.place.dto;

import com.contentruck.hypofit.place.service.PlaceSearchResult;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

public record PlaceSearchResponse(
        String id,
        String name,
        String address,
        @JsonProperty("road_address") String roadAddress,
        String category,
        String phone,
        @Schema(minimum = "-90", maximum = "90")
        double latitude,
        @Schema(minimum = "-180", maximum = "180")
        double longitude,
        @Schema(defaultValue = "kakao_place")
        String source
) {
    public static PlaceSearchResponse from(PlaceSearchResult result) {
        return new PlaceSearchResponse(
                result.id(),
                result.name(),
                result.address(),
                result.roadAddress(),
                result.category(),
                result.phone(),
                result.latitude(),
                result.longitude(),
                "kakao_place"
        );
    }
}
