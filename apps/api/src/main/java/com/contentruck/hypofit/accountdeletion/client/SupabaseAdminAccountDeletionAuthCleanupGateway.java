package com.contentruck.hypofit.accountdeletion.client;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionAuthCleanupGateway;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionAuthCleanupGateway.AuthCleanupResult;
import com.contentruck.hypofit.common.config.HypofitProperties;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class SupabaseAdminAccountDeletionAuthCleanupGateway implements AccountDeletionAuthCleanupGateway {

    private final RestClient restClient;
    private final HypofitProperties properties;

    public SupabaseAdminAccountDeletionAuthCleanupGateway(RestClient.Builder restClientBuilder, HypofitProperties properties) {
        this.restClient = restClientBuilder.build();
        this.properties = properties;
    }

    @Override
    public AuthCleanupResult deleteAuthUser(UUID userId) {
        if (!StringUtils.hasText(properties.getSupabaseUrl()) || !StringUtils.hasText(properties.getSupabaseServiceRoleKey())) {
            return new AuthCleanupResult("skipped_missing_config", "missing_supabase_admin_config");
        }

        String url = properties.getSupabaseUrl().replaceAll("/+$", "") + "/auth/v1/admin/users/" + userId;
        try {
            restClient.delete()
                    .uri(url)
                    .header("Authorization", "Bearer " + properties.getSupabaseServiceRoleKey())
                    .header("apikey", properties.getSupabaseServiceRoleKey())
                    .header("Accept", "application/json")
                    .retrieve()
                    .toBodilessEntity();
            return new AuthCleanupResult("deleted", null);
        } catch (RestClientResponseException exception) {
            int statusCode = exception.getStatusCode().value();
            if (statusCode == 404) {
                return new AuthCleanupResult("not_found", null);
            }
            if (statusCode >= 500) {
                return new AuthCleanupResult("failed_retryable", "http_" + statusCode);
            }
            return new AuthCleanupResult("failed_non_retryable", "http_" + statusCode);
        } catch (ResourceAccessException exception) {
            return new AuthCleanupResult("failed_retryable", "network_error");
        } catch (IllegalArgumentException exception) {
            return new AuthCleanupResult("failed_non_retryable", "invalid_supabase_admin_response");
        }
    }
}
