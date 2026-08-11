package com.contentruck.hypofit.place.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.place.domain.PlaceSearchResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class PlaceSearchResponseTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void fromIncludesKakaoSourceInResponsePayload() throws Exception {
        PlaceSearchResponse response = PlaceSearchResponse.from(new PlaceSearchResult(
                "place-1",
                "Hypofit Cafe",
                "Seoul address",
                "Seoul road",
                "Cafe",
                "010-1234-5678",
                37.5665,
                126.9780
        ));

        assertThat(response.source()).isEqualTo("kakao");
        assertThat(objectMapper.writeValueAsString(response)).contains("\"source\":\"kakao\"");
    }
}
