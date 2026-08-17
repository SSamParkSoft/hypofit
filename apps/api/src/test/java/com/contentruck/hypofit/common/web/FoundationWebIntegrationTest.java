package com.contentruck.hypofit.common.web;


import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.contentruck.hypofit.HypofitApplication;
import com.contentruck.hypofit.common.observability.RequestIdContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = HypofitApplication.class,
        properties = {
                "spring.profiles.active=test",
                "hypofit.database-url=postgresql://postgres:postgres@127.0.0.1:5432/hypofit",
                "hypofit.supabase-jwt-secret=test-secret-test-secret-test-secret-1234",
                "hypofit.jwt-audience=authenticated"
        }
)
@Import(FoundationWebIntegrationTest.FoundationTestConfiguration.class)
class FoundationWebIntegrationTest {

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private com.contentruck.hypofit.common.observability.RequestIdFilter requestIdFilter;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .addFilters(requestIdFilter)
                .apply(springSecurity())
                .build();
    }

    @Test
    void wrapsMissingBearerTokenWithHypofitEnvelope() throws Exception {
        mockMvc.perform(get("/test/secure"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists(RequestIdContext.REQUEST_ID_HEADER))
                .andExpect(jsonPath("$.detail").value("Missing bearer token"))
                .andExpect(jsonPath("$.error.code").value("auth_required"))
                .andExpect(jsonPath("$.error.message").value("로그인이 필요해요."));
    }

    @Test
    void preservesIncomingRequestId() throws Exception {
        mockMvc.perform(get("/test/secure").header(RequestIdContext.REQUEST_ID_HEADER, "test-request-id"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(RequestIdContext.REQUEST_ID_HEADER, "test-request-id"))
                .andExpect(jsonPath("$.error.request_id").value("test-request-id"));
    }

    @Test
    void invalidBearerTokenUsesSegmentedAuthCode() throws Exception {
        mockMvc.perform(get("/test/secure").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("auth_invalid_token"))
                .andExpect(jsonPath("$.error.message").value("로그인 정보를 다시 확인해 주세요."));
    }

    @Test
    void expiredBearerTokenUsesSegmentedAuthCode() throws Exception {
        mockMvc.perform(get("/test/secure").header("Authorization", "Bearer " + expiredToken()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("auth_token_expired"))
                .andExpect(jsonPath("$.error.message").value("다시 로그인해 주세요."));
    }

    @Test
    void validationErrorsReturn422Envelope() throws Exception {
        mockMvc.perform(post("/test/validation")
                        .with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("validation_failed"))
                .andExpect(jsonPath("$.error.message").value("입력값을 확인해 주세요."))
                .andExpect(jsonPath("$.error.field_errors[0].field").value("name"));
    }

    @Test
    void queryValidationErrorsReturn422Envelope() throws Exception {
        mockMvc.perform(get("/test/query-validation")
                        .with(jwt())
                        .queryParam("count", "0"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("validation_failed"))
                .andExpect(jsonPath("$.error.field_errors[0].field").value("count"));
    }

    @Test
    void healthRoutesRemainPublicAndCompatible() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("hypofit-api"));

        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("api-v1"));

        mockMvc.perform(get("/api/v1/health/ready"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.checks.database").value("ok"));
    }

    @RestController
    @Validated
    static class TestController {

        @GetMapping("/test/secure")
        public Map<String, Object> secure(@AuthenticationPrincipal Jwt jwt) {
            return Map.of("subject", jwt.getSubject());
        }

        @PostMapping("/test/validation")
        public Map<String, Object> validation(@Valid @RequestBody ValidationRequest request) {
            return Map.of("name", request.name());
        }

        @GetMapping("/test/query-validation")
        public Map<String, Object> queryValidation(@RequestParam @Min(value = 1, message = "must be greater than or equal to 1") int count) {
            return Map.of("count", count);
        }
    }

    record ValidationRequest(@NotBlank(message = "must not be blank") String name) {
    }

    @TestConfiguration
    static class FoundationTestConfiguration {

        @Bean
        TestController testController() {
            return new TestController();
        }

        @Bean
        @Primary
        ReadinessService readinessService() {
            return new ReadinessService(null, null) {
                @Override
                public Map<String, Object> readiness() {
                    return Map.of(
                            "status", "ok",
                            "service", "hypofit-api",
                            "checks", Map.of(
                                    "database", "ok",
                                    "kakao_rest_api_key", true,
                                    "supabase_url", true,
                                    "jwks_configured", true,
                                    "outbound_email", Map.of("configured", true, "from_email_configured", true, "provider", "resend", "support_email_configured", true),
                                    "push", Map.of(
                                            "enabled", false,
                                            "worker_enabled", false,
                                            "worker", Map.of("active_sleep_seconds", 2.0, "batch_size", 20, "error_sleep_seconds", 30.0, "idle_sleep_seconds", 30.0),
                                            "batch_size", 100,
                                            "max_attempts", 3,
                                            "apns", Map.of("enabled", false, "environment", "production", "configured", false, "private_key_file_present", false),
                                            "fcm", Map.of("enabled", false, "configured", false, "service_account_file_present", false)
                                    ),
                                    "social_auth", Map.of(
                                            "enabled", false,
                                            "attempt_pepper_configured", false,
                                            "identity_pepper_configured", false,
                                            "providers", Map.of("apple", "disabled", "google", "disabled", "kakao", "disabled", "naver", "disabled"),
                                            "apple_platforms", Map.of("web", "disabled", "ios", "disabled", "android", "unsupported_platform")
                                    )
                            )
                    );
                }
            };
        }
    }

    private String expiredToken() throws JOSEException {
        SignedJWT jwt = new SignedJWT(
                new JWSHeader(JWSAlgorithm.HS256),
                new JWTClaimsSet.Builder()
                        .subject("25c2fd5d-12ab-4b31-b50d-8cd4f9321e54")
                        .audience("authenticated")
                        .expirationTime(java.util.Date.from(Instant.now().minusSeconds(60)))
                        .build()
        );
        jwt.sign(new MACSigner("test-secret-test-secret-test-secret-1234".getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }
}
