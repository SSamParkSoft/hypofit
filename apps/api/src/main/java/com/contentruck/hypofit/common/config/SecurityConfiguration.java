package com.contentruck.hypofit.common.config;

import com.contentruck.hypofit.common.security.HypofitBearerTokenAuthenticationEntryPoint;
import com.contentruck.hypofit.common.security.HypofitJwtDecoder;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            HypofitBearerTokenAuthenticationEntryPoint authenticationEntryPoint,
            JwtDecoder jwtDecoder
    ) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable);
        http.cors(Customizer.withDefaults());
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers(
                        "/health",
                        "/api/v1/health",
                        "/api/v1/health/ready",
                        "/actuator/health",
                        "/actuator/health/**",
                        "/actuator/info",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/interview-posts/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/places/search").permitAll()
                .requestMatchers("/api/v1/account-deletion-requests/public/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().authenticated()
        );
        http.oauth2ResourceServer(oauth2 -> oauth2
                .authenticationEntryPoint(authenticationEntryPoint)
                .jwt(jwt -> jwt.decoder(jwtDecoder))
        );
        http.exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(authenticationEntryPoint));
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(HypofitProperties properties, MeterRegistry meterRegistry) {
        return new HypofitJwtDecoder(properties, meterRegistry);
    }
}
