package com.contentruck.hypofit.place.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.place.domain.PlaceSearchResult;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class PlaceSearchServiceTest {

    @Test
    void normalizesQueryAndDelegatesCoordinates() {
        AtomicReference<String> capturedQuery = new AtomicReference<>();
        PlaceSearchGateway gateway = (query, latitude, longitude, radiusMeters, limit) -> {
            capturedQuery.set(query);
            return List.of(new PlaceSearchResult("1", "한양대", null, null, null, null, 37.2, 126.8));
        };
        PlaceSearchService service = new PlaceSearchService(gateway);

        List<PlaceSearchResult> results = service.search("  한양대   에리카 ", 37.2, 126.8, 3000, 10);

        assertThat(capturedQuery).hasValue("한양대 에리카");
        assertThat(results).hasSize(1);
    }

    @Test
    void rejectsIncompleteCoordinatePair() {
        PlaceSearchService service = new PlaceSearchService((query, latitude, longitude, radiusMeters, limit) -> List.of());

        assertThatThrownBy(() -> service.search("한양대", 37.2, null, null, 10))
                .isInstanceOf(PlaceSearchValidationException.class)
                .hasMessageContaining("lat and lng");
    }

    @Test
    void rejectsQueryThatIsBlankAfterNormalization() {
        PlaceSearchService service = new PlaceSearchService((query, latitude, longitude, radiusMeters, limit) -> List.of());

        assertThatThrownBy(() -> service.search("   ", null, null, null, 10))
                .isInstanceOf(PlaceSearchValidationException.class)
                .hasMessageContaining("at least 2 characters");
    }
}
