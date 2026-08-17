package com.contentruck.hypofit.common.security;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.config.SecurityConfiguration;
import com.contentruck.hypofit.common.config.WebConfiguration;
import com.contentruck.hypofit.common.observability.RequestIdContext;
import com.contentruck.hypofit.common.observability.RequestIdFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(
        classes = SecurityFilterChainIntegrationTest.TestApplication.class,
        properties = {
                "spring.profiles.active=test",
                "hypofit.env=local",
                "hypofit.supabase-jwt-secret=test-secret-test-secret-test-secret-1234",
                "hypofit.jwt-audience=authenticated",
                "hypofit.cors-origins[0]=https://hypofit.bukae.co.kr",
                "hypofit.cors-origins[1]=http://localhost:5173",
                "management.endpoint.health.validate-group-membership=false",
                "spring.autoconfigure.exclude="
                        + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                        + "org.springframework.boot.jdbc.autoconfigure.JdbcClientAutoConfiguration,"
                        + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                        + "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration"
        }
)
class SecurityFilterChainIntegrationTest {

    private static final String SIGNING_SECRET = "test-secret-test-secret-test-secret-1234";
    private static final String AUDIENCE = "authenticated";
    private static final String USER_ID = "b6fba951-155d-4597-a9a3-156a7ebcc8b1";
    private static final Instant VALID_ISSUED_AT = Instant.parse("2030-08-04T02:59:00Z");
    private static final Instant VALID_EXPIRES_AT = Instant.parse("2030-08-04T03:10:00Z");
    private static final Instant EXPIRED_ISSUED_AT = Instant.parse("2020-08-04T02:00:00Z");
    private static final Instant EXPIRED_EXPIRES_AT = Instant.parse("2020-08-04T03:00:00Z");

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private RequestIdFilter requestIdFilter;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .addFilters(requestIdFilter)
                .apply(springSecurity())
                .build();
    }

    @Test
    void publicRouteRemainsAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/interview-posts/test-public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route").value("public"));
    }

    @Test
    void protectedRouteReturnsStableUnauthorizedEnvelopeAndPreservesRequestId() throws Exception {
        mockMvc.perform(get("/api/v1/private-test")
                        .header(RequestIdContext.REQUEST_ID_HEADER, "req-test-123"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(RequestIdContext.REQUEST_ID_HEADER, "req-test-123"))
                .andExpect(jsonPath("$.error.code").value("auth_required"))
                .andExpect(jsonPath("$.error.request_id").value("req-test-123"))
                .andExpect(jsonPath("$.error.debug_message").value("Missing bearer token"))
                .andExpect(jsonPath("$.detail").value("Missing bearer token"));
    }

    @Test
    void protectedRouteAcceptsValidBearerToken() throws Exception {
        mockMvc.perform(get("/api/v1/private-test")
                        .header("Authorization", "Bearer " + token(
                                SIGNING_SECRET,
                                List.of(AUDIENCE),
                                VALID_ISSUED_AT,
                                VALID_EXPIRES_AT
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.route").value("private"))
                .andExpect(jsonPath("$.subject").value(USER_ID));
    }

    @Test
    void invalidBearerTokenUsesStableErrorCode() throws Exception {
        mockMvc.perform(get("/api/v1/private-test")
                        .header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("auth_invalid_token"))
                .andExpect(jsonPath("$.error.message").value("로그인 정보를 다시 확인해 주세요."));
    }

    @Test
    void expiredBearerTokenUsesExpiredErrorCode() throws Exception {
        mockMvc.perform(get("/api/v1/private-test")
                        .header("Authorization", "Bearer " + token(
                                SIGNING_SECRET,
                                List.of(AUDIENCE),
                                EXPIRED_ISSUED_AT,
                                EXPIRED_EXPIRES_AT
                        )))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("auth_token_expired"))
                .andExpect(jsonPath("$.error.message").value("다시 로그인해 주세요."));
    }

    @Test
    void preflightAllowsConfiguredCorsOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/private-test")
                        .header("Origin", "https://hypofit.bukae.co.kr")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://hypofit.bukae.co.kr"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test
    void preflightRejectsDisallowedCorsOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/private-test")
                        .header("Origin", "https://evil.example.com")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isForbidden());
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EnableConfigurationProperties(HypofitProperties.class)
    @Import({
            SecurityConfiguration.class,
            WebConfiguration.class,
            HypofitBearerTokenAuthenticationEntryPoint.class,
            RequestIdFilter.class,
            TestController.class
    })
    static class TestApplication {

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }

    @RestController
    static class TestController {

        @GetMapping(path = "/api/v1/interview-posts/test-public", produces = MediaType.APPLICATION_JSON_VALUE)
        Map<String, Object> publicRoute() {
            return Map.of("route", "public");
        }

        @GetMapping(path = "/api/v1/private-test", produces = MediaType.APPLICATION_JSON_VALUE)
        Map<String, Object> privateRoute(@AuthenticationPrincipal Jwt jwt) {
            return Map.of(
                    "route", "private",
                    "subject", jwt.getSubject()
            );
        }
    }

    private String token(
            String signingSecret,
            List<String> audience,
            Instant issuedAt,
            Instant expiresAt
    ) throws JOSEException {
        SignedJWT signedJwt = new SignedJWT(
                new JWSHeader(JWSAlgorithm.HS256),
                new JWTClaimsSet.Builder()
                        .subject(USER_ID)
                        .audience(audience)
                        .issuer("https://hypofit.supabase.test/auth/v1")
                        .issueTime(Date.from(issuedAt))
                        .expirationTime(Date.from(expiresAt))
                        .claim("role", "authenticated")
                        .build()
        );
        signedJwt.sign(new MACSigner(signingSecret.getBytes(StandardCharsets.UTF_8)));
        return signedJwt.serialize();
    }
}

@SpringBootTest(
        classes = SecurityFilterChainIntegrationTest.TestApplication.class,
        properties = {
                "spring.profiles.active=test",
                "hypofit.env=production",
                "hypofit.supabase-jwt-secret=test-secret-test-secret-test-secret-1234",
                "hypofit.jwt-audience=authenticated",
                "management.endpoint.health.validate-group-membership=false",
                "spring.autoconfigure.exclude="
                        + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
                        + "org.springframework.boot.jdbc.autoconfigure.JdbcClientAutoConfiguration,"
                        + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
                        + "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration"
        }
)
class ProductionSecurityFilterChainIntegrationTest {

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private RequestIdFilter requestIdFilter;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .addFilters(requestIdFilter)
                .apply(springSecurity())
                .build();
    }

    @Test
    void productionUnauthorizedResponseSuppressesDebugFields() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/private-test"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("auth_required"))
                .andExpect(jsonPath("$.error.request_id").exists())
                .andExpect(jsonPath("$.error.debug_message").value(nullValue()))
                .andExpect(jsonPath("$.detail").doesNotExist())
                .andReturn();

        String requestId = result.getResponse().getHeader(RequestIdContext.REQUEST_ID_HEADER);
        org.junit.jupiter.api.Assertions.assertNotNull(requestId);
        org.junit.jupiter.api.Assertions.assertTrue(result.getResponse().getContentAsString().contains(requestId));
    }
}
