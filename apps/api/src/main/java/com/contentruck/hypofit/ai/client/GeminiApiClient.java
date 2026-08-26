package com.contentruck.hypofit.ai.client;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class GeminiApiClient {

    private static final String API_KEY_HEADER = "x-goog-api-key";

    private final RestClient restClient;
    private final HypofitProperties properties;

    public GeminiApiClient(RestClient.Builder restClientBuilder, HypofitProperties properties) {
        this.restClient = restClientBuilder
                .clone()
                .baseUrl(properties.getResolvedGeminiApiBaseUrl())
                .build();
        this.properties = properties;
    }

    public GeminiConnectionResult verifyAccess() {
        if (!StringUtils.hasText(properties.getGeminiApiKey())) {
            return GeminiConnectionResult.notConfigured();
        }

        try {
            GeminiModelsResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1beta/models")
                            .queryParam("pageSize", 1)
                            .build())
                    .header(API_KEY_HEADER, properties.getGeminiApiKey())
                    .retrieve()
                    .body(GeminiModelsResponse.class);
            int accessibleModels = response == null || response.models() == null
                    ? 0
                    : response.models().size();
            return GeminiConnectionResult.authenticated(accessibleModels);
        } catch (RestClientException | IllegalArgumentException exception) {
            return GeminiConnectionResult.unavailable();
        }
    }

    private record GeminiModelsResponse(List<GeminiModel> models) {
    }

    private record GeminiModel(String name) {
    }

    public record GeminiConnectionResult(String status, int accessibleModels) {

        public static GeminiConnectionResult authenticated(int accessibleModels) {
            return new GeminiConnectionResult("authenticated", accessibleModels);
        }

        public static GeminiConnectionResult notConfigured() {
            return new GeminiConnectionResult("not_configured", 0);
        }

        public static GeminiConnectionResult unavailable() {
            return new GeminiConnectionResult("unavailable", 0);
        }

        public boolean authenticated() {
            return "authenticated".equals(status);
        }
    }
}
