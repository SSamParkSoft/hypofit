package com.contentruck.hypofit.place.controller;

import com.contentruck.hypofit.place.dto.PlaceSearchResponse;
import com.contentruck.hypofit.place.service.PlaceSearchService;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/places")
public class PlaceSearchController {

    private final PlaceSearchService service;

    public PlaceSearchController(PlaceSearchService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public List<PlaceSearchResponse> search(
            @RequestParam @NotNull @Size(min = 2, max = 80) String query,
            @RequestParam(name = "lat", required = false) @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @RequestParam(name = "lng", required = false) @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @RequestParam(name = "radius_m", required = false) @Min(0) @Max(20000) Integer radiusMeters,
            @RequestParam(defaultValue = "10") @Min(1) @Max(15) int limit
    ) {
        return service.search(query, latitude, longitude, radiusMeters, limit).stream()
                .map(PlaceSearchResponse::from)
                .toList();
    }
}
