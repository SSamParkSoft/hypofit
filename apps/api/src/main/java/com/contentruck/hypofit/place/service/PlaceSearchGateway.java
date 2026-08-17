package com.contentruck.hypofit.place.service;

import java.util.List;

public interface PlaceSearchGateway {
    List<PlaceSearchResult> search(String query, Double latitude, Double longitude, Integer radiusMeters, int limit);
}
