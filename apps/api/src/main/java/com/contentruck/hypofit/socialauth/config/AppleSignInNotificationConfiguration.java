package com.contentruck.hypofit.socialauth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@Configuration
public class AppleSignInNotificationConfiguration {

    @Bean("appleSignInJwksRestClient")
    RestClient appleSignInJwksRestClient(RestClient.Builder restClientBuilder) {
        return restClientBuilder
                .clone()
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}
