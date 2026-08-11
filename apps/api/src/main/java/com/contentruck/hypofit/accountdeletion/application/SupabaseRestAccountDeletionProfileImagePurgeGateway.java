package com.contentruck.hypofit.accountdeletion.application;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriUtils;

@Component
public class SupabaseRestAccountDeletionProfileImagePurgeGateway implements AccountDeletionProfileImagePurgeGateway {

    private final RestClient restClient;
    private final HypofitProperties properties;

    public SupabaseRestAccountDeletionProfileImagePurgeGateway(
            RestClient.Builder restClientBuilder,
            HypofitProperties properties
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        int timeoutMillis = (int) Duration.ofSeconds(4).toMillis();
        requestFactory.setConnectTimeout(timeoutMillis);
        requestFactory.setReadTimeout(timeoutMillis);
        this.restClient = restClientBuilder.requestFactory(requestFactory).build();
        this.properties = properties;
    }

    @Override
    public String purgeProfileImage(String profileImagePath) {
        String normalizedPath = AccountDeletionCleanupPolicy.normalizeProfileImagePath(profileImagePath);
        if (normalizedPath == null) {
            return "no_profile_image";
        }
        if (!StringUtils.hasText(properties.getSupabaseUrl()) || !StringUtils.hasText(properties.getSupabaseServiceRoleKey())) {
            return "skipped_missing_storage_config";
        }

        String url = properties.getSupabaseUrl().replaceAll("/+$", "")
                + "/storage/v1/object/"
                + AccountDeletionCleanupPolicy.PROFILE_IMAGE_BUCKET
                + "/"
                + encodePath(normalizedPath);
        try {
            restClient.delete()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + properties.getSupabaseServiceRoleKey())
                    .header("apikey", properties.getSupabaseServiceRoleKey())
                    .retrieve()
                    .toBodilessEntity();
            return "deleted";
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                return "already_missing";
            }
            return "delete_failed";
        } catch (ResourceAccessException exception) {
            return "delete_failed";
        } catch (RestClientException | IllegalArgumentException exception) {
            return "delete_failed";
        }
    }

    private String encodePath(String profileImagePath) {
        return Arrays.stream(profileImagePath.split("/", -1))
                .map(segment -> UriUtils.encodePathSegment(segment, StandardCharsets.UTF_8))
                .collect(Collectors.joining("/"));
    }
}
