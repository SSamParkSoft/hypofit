package com.contentruck.hypofit.place.application;

import com.contentruck.hypofit.place.domain.PlaceSearchResult;
import java.util.List;

public interface PlaceSearchGateway {
    List<PlaceSearchResult> search(String query, Double latitude, Double longitude, Integer radiusMeters, int limit);
}
