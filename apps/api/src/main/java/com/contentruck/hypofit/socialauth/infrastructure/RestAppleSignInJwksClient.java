package com.contentruck.hypofit.socialauth.infrastructure;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.application.AppleSignInJwksClient;
import com.contentruck.hypofit.socialauth.config.AppleSignInNotificationProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.JWK;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class RestAppleSignInJwksClient implements AppleSignInJwksClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final AppleSignInNotificationProperties properties;

    public RestAppleSignInJwksClient(
            @Qualifier("appleSignInJwksRestClient") RestClient restClient,
            ObjectMapper objectMapper,
            AppleSignInNotificationProperties properties
    ) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Override
    public Map<String, JWK> fetchKeys() {
        String jwksUrl = properties.getJwksUrl() == null ? "" : properties.getJwksUrl().trim();
        if (!StringUtils.hasText(jwksUrl)) {
            throw unavailable("Apple Sign in JWKS URL is not configured");
        }

        String body;
        try {
            body = restClient.get()
                    .uri(jwksUrl)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException exception) {
            throw unavailable("Apple notification JWKS fetch failed");
        }

        try {
            JsonNode root = objectMapper.readTree(body == null ? "" : body);
            JsonNode keys = root.get("keys");
            if (keys == null || !keys.isArray()) {
                throw unavailable("Apple notification JWKS response is invalid");
            }

            Map<String, JWK> parsed = new LinkedHashMap<>();
            for (JsonNode keyNode : keys) {
                if (!keyNode.isObject()) {
                    continue;
                }
                JsonNode kidNode = keyNode.get("kid");
                if (kidNode == null || !kidNode.isTextual() || kidNode.asText().isBlank()) {
                    continue;
                }
                try {
                    parsed.put(kidNode.asText().trim(), JWK.parse(keyNode.toString()));
                } catch (java.text.ParseException ignored) {
                    // Keep compatible practical behavior: malformed unrelated keys do not block valid ones.
                }
            }
            return parsed;
        } catch (HypofitException exception) {
            throw exception;
        } catch (Exception exception) {
            throw unavailable("Apple notification JWKS response is invalid");
        }
    }

    private HypofitException unavailable(String debugMessage) {
        return new HypofitException(
                "social_provider_unavailable",
                "Apple 로그인 알림 처리 설정을 확인하지 못했어요.",
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                debugMessage
        );
    }
}
