package com.contentruck.hypofit.place.client;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.place.service.PlaceSearchGateway;
import com.contentruck.hypofit.place.service.PlaceSearchUnavailableException;
import com.contentruck.hypofit.place.service.PlaceSearchResult;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class KakaoPlaceSearchClient implements PlaceSearchGateway {

    private final RestClient restClient;
    private final HypofitProperties properties;

    public KakaoPlaceSearchClient(RestClient.Builder restClientBuilder, HypofitProperties properties) {
        this.restClient = restClientBuilder.build();
        this.properties = properties;
    }

    @Override
    public List<PlaceSearchResult> search(
            String query,
            Double latitude,
            Double longitude,
            Integer radiusMeters,
            int limit
    ) {
        if (!StringUtils.hasText(properties.getKakaoRestApiKey())) {
            throw new PlaceSearchUnavailableException("Kakao REST API key is not configured");
        }

        try {
            KakaoSearchResponse response = restClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.scheme("https")
                                .host("dapi.kakao.com")
                                .path("/v2/local/search/keyword.json")
                                .queryParam("query", query)
                                .queryParam("size", Math.min(Math.max(limit, 1), 15));
                        if (latitude != null && longitude != null) {
                            uriBuilder.queryParam("x", longitude).queryParam("y", latitude);
                            if (radiusMeters != null) {
                                uriBuilder.queryParam("radius", radiusMeters);
                            }
                        }
                        return uriBuilder.build();
                    })
                    .header("Authorization", "KakaoAK " + properties.getKakaoRestApiKey())
                    .retrieve()
                    .body(KakaoSearchResponse.class);

            if (response == null || response.documents() == null) {
                return List.of();
            }
            return response.documents().stream().flatMap(document -> document.toResult().stream()).toList();
        } catch (RestClientException | IllegalArgumentException exception) {
            throw new PlaceSearchUnavailableException("Kakao place search failed");
        }
    }

    record KakaoSearchResponse(List<KakaoPlaceDocument> documents) {
    }

    record KakaoPlaceDocument(
            String id,
            @JsonProperty("place_name") String placeName,
            @JsonProperty("address_name") String addressName,
            @JsonProperty("road_address_name") String roadAddressName,
            @JsonProperty("category_name") String categoryName,
            String phone,
            String x,
            String y
    ) {
        java.util.Optional<PlaceSearchResult> toResult() {
            try {
                double latitude = Double.parseDouble(y);
                double longitude = Double.parseDouble(x);
                String resolvedId = StringUtils.hasText(id) ? id : latitude + "," + longitude;
                String resolvedName = StringUtils.hasText(placeName) ? placeName : "장소";
                return java.util.Optional.of(new PlaceSearchResult(
                        resolvedId,
                        resolvedName,
                        emptyToNull(addressName),
                        emptyToNull(roadAddressName),
                        emptyToNull(categoryName),
                        emptyToNull(phone),
                        latitude,
                        longitude
                ));
            } catch (NumberFormatException | NullPointerException exception) {
                return java.util.Optional.empty();
            }
        }

        private String emptyToNull(String value) {
            return StringUtils.hasText(value) ? value : null;
        }
    }
}
