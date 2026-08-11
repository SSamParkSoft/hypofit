package com.contentruck.hypofit.socialauth.infrastructure;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.application.SocialAuthAdminClient;
import com.contentruck.hypofit.socialauth.domain.SocialAuthReadModels;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class SupabaseSocialAuthAdminClient implements SocialAuthAdminClient {

    private final RestClient restClient;
    private final HypofitProperties properties;

    public SupabaseSocialAuthAdminClient(
            @Qualifier("socialAuthSupabaseAdminRestClient") RestClient restClient,
            HypofitProperties properties
    ) {
        this.restClient = restClient;
        this.properties = properties;
    }

    @Override
    @SuppressWarnings("unchecked")
    public SocialAuthAdminUser getAuthUser(UUID userId) {
        if (!StringUtils.hasText(properties.getSupabaseUrl())
                || !StringUtils.hasText(properties.getSupabaseServiceRoleKey())) {
            throw unavailable("Supabase Admin credentials are not configured");
        }

        try {
            Object response = restClient.get()
                    .uri(normalizedSupabaseUrl() + "/auth/v1/admin/users/{userId}", userId)
                    .retrieve()
                    .body(Map.class);
            if (!(response instanceof Map<?, ?> payload)) {
                throw notVerified("Supabase Admin user payload was not an object");
            }
            Object rawIdentities = payload.get("identities");
            if (!(rawIdentities instanceof List<?> identities)) {
                throw notVerified("Supabase Admin user identities were not a list");
            }
            return new SocialAuthAdminUser(parseVerifiedIdentities(identities));
        } catch (HypofitException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 404) {
                throw notVerified("Supabase Admin user lookup failed with " + exception.getStatusCode().value());
            }
            throw unavailable("Supabase Admin user lookup failed with " + exception.getStatusCode().value());
        } catch (ResourceAccessException exception) {
            throw unavailable("Supabase Admin user lookup failed");
        } catch (RestClientException | IllegalArgumentException exception) {
            throw unavailable("Supabase Admin user lookup failed");
        }
    }

    private List<SocialAuthReadModels.VerifiedProviderIdentity> parseVerifiedIdentities(List<?> identities) {
        List<SocialAuthReadModels.VerifiedProviderIdentity> verified = new ArrayList<>();
        Set<String> seenProviders = new LinkedHashSet<>();
        for (Object rawIdentity : identities) {
            SocialAuthReadModels.VerifiedProviderIdentity parsed = parseVerifiedIdentity(rawIdentity);
            if (parsed == null || seenProviders.contains(parsed.provider())) {
                continue;
            }
            verified.add(parsed);
            seenProviders.add(parsed.provider());
        }
        return verified;
    }

    @SuppressWarnings("unchecked")
    private SocialAuthReadModels.VerifiedProviderIdentity parseVerifiedIdentity(Object rawIdentity) {
        if (!(rawIdentity instanceof Map<?, ?> payload)) {
            return null;
        }

        String provider = normalizeProvider(asString(payload.get("provider")));
        if (provider == null) {
            return null;
        }

        Map<String, Object> identityData = payload.get("identity_data") instanceof Map<?, ?> rawData
                ? (Map<String, Object>) rawData
                : Map.of();
        String subject = trimToNull(firstNonBlank(
                asString(identityData.get("sub")),
                asString(payload.get("provider_id")),
                asString(payload.get("identity_id"))
        ));
        String identityId = trimToNull(firstNonBlank(
                asString(payload.get("id")),
                asString(payload.get("identity_id"))
        ));
        if (subject == null || identityId == null) {
            throw notVerified("Supabase Admin identity payload was incomplete");
        }

        String email = normalizeEmail(asString(identityData.get("email")));
        Boolean emailVerified = optionalBoolean(identityData.get("email_verified"));
        return new SocialAuthReadModels.VerifiedProviderIdentity(
                provider,
                subject,
                identityId,
                email,
                emailVerified
        );
    }

    private String normalizedSupabaseUrl() {
        return properties.getSupabaseUrl().replaceAll("/+$", "");
    }

    private String normalizeProvider(String provider) {
        if (!StringUtils.hasText(provider)) {
            return null;
        }
        String normalized = provider.trim().toLowerCase();
        if ("custom:naver".equals(normalized)) {
            return "naver";
        }
        return switch (normalized) {
            case "apple", "google", "kakao", "naver" -> normalized;
            default -> null;
        };
    }

    private String normalizeEmail(String email) {
        String normalized = trimToNull(email);
        return normalized == null ? null : normalized.toLowerCase();
    }

    private Boolean optionalBoolean(Object value) {
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }
        if (value instanceof String stringValue) {
            if ("true".equalsIgnoreCase(stringValue)) {
                return Boolean.TRUE;
            }
            if ("false".equalsIgnoreCase(stringValue)) {
                return Boolean.FALSE;
            }
        }
        return null;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private HypofitException notVerified(String debugMessage) {
        return new HypofitException(
                "social_identity_not_verified",
                "로그인 정보를 확인하지 못했어요.",
                HttpStatus.UNAUTHORIZED.value(),
                debugMessage
        );
    }

    private HypofitException unavailable(String debugMessage) {
        return new HypofitException(
                "social_provider_unavailable",
                "소셜 로그인 확인이 지연되고 있어요.",
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                debugMessage
        );
    }
}
