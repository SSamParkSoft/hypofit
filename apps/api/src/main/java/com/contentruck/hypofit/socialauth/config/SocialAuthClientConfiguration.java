package com.contentruck.hypofit.socialauth.config;

import com.contentruck.hypofit.common.config.HypofitProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Configuration
public class SocialAuthClientConfiguration {

    @Bean("socialAuthSupabaseAdminRestClient")
    RestClient socialAuthSupabaseAdminRestClient(
            RestClient.Builder restClientBuilder,
            HypofitProperties properties
    ) {
        RestClient.Builder builder = restClientBuilder
                .clone()
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        if (StringUtils.hasText(properties.getSupabaseServiceRoleKey())) {
            builder = builder
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getSupabaseServiceRoleKey())
                    .defaultHeader("apikey", properties.getSupabaseServiceRoleKey());
        }
        return builder.build();
    }
}
