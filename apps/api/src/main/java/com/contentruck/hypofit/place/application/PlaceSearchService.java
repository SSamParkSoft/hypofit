package com.contentruck.hypofit.place.application;

import com.contentruck.hypofit.place.domain.PlaceSearchResult;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PlaceSearchService {

    private final PlaceSearchGateway gateway;

    public PlaceSearchService(PlaceSearchGateway gateway) {
        this.gateway = gateway;
    }

    public List<PlaceSearchResult> search(
            String rawQuery,
            Double latitude,
            Double longitude,
            Integer radiusMeters,
            int limit
    ) {
        if ((latitude == null) != (longitude == null)) {
            throw new PlaceSearchValidationException("lat and lng must be provided together");
        }

        String query = rawQuery == null ? "" : rawQuery.trim().replaceAll("\\s+", " ");
        if (query.length() < 2) {
            throw new PlaceSearchValidationException("query must be at least 2 characters after trimming");
        }

        return gateway.search(query, latitude, longitude, radiusMeters, limit);
    }
}
