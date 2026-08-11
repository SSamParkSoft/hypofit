package com.contentruck.hypofit.socialauth.config;

import com.contentruck.hypofit.common.security.HypofitBearerTokenAuthenticationEntryPoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SocialAuthSecurityConfiguration {

    @Bean
    @Order(0)
    SecurityFilterChain socialAuthSecurityFilterChain(
            HttpSecurity http,
            HypofitBearerTokenAuthenticationEntryPoint authenticationEntryPoint,
            JwtDecoder jwtDecoder
    ) throws Exception {
        http.securityMatcher("/api/v1/auth/social/**");
        http.csrf(AbstractHttpConfigurer::disable);
        http.cors(Customizer.withDefaults());
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/social/capabilities").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/social/apple/notifications").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/social/attempts").permitAll()
                .anyRequest().authenticated()
        );
        http.oauth2ResourceServer(oauth2 -> oauth2
                .authenticationEntryPoint(authenticationEntryPoint)
                .jwt(jwt -> jwt.decoder(jwtDecoder))
        );
        http.exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(authenticationEntryPoint));
        return http.build();
    }
}
