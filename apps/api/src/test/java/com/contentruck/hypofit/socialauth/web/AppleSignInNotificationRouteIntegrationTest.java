package com.contentruck.hypofit.socialauth.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.ApiExceptionHandler;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.common.observability.RequestIdContext;
import com.contentruck.hypofit.common.observability.RequestIdFilter;
import com.contentruck.hypofit.common.security.HypofitBearerTokenAuthenticationEntryPoint;
import com.contentruck.hypofit.socialauth.application.AppleSignInNotificationService;
import com.contentruck.hypofit.socialauth.application.SocialAuthService;
import com.contentruck.hypofit.socialauth.config.SocialAuthSecurityConfiguration;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(
        classes = AppleSignInNotificationRouteIntegrationTest.TestApplication.class,
        properties = {
                "spring.profiles.active=test",
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
class AppleSignInNotificationRouteIntegrationTest {

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private RequestIdFilter requestIdFilter;

    private MockMvc mockMvc;

    @MockitoBean
    private SocialAuthService socialAuthService;

    @MockitoBean
    private AppleSignInNotificationService notificationService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .addFilters(requestIdFilter)
                .apply(springSecurity())
                .build();
    }

    @Test
    void routeIsPublicAndReturnsAcceptedEnvelope() throws Exception {
        when(notificationService.processNotification(any(AppleSignInNotificationReceive.class)))
                .thenReturn(AppleSignInNotificationAccepted.accepted());

        mockMvc.perform(post("/api/v1/auth/social/apple/notifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":"signed-payload"}
                                """))
                .andExpect(status().isOk())
                .andExpect(header().exists(RequestIdContext.REQUEST_ID_HEADER))
                .andExpect(jsonPath("$.status").value("accepted"));
    }

    @Test
    void routeUsesStandardErrorEnvelopeForInvalidNotifications() throws Exception {
        when(notificationService.processNotification(any(AppleSignInNotificationReceive.class)))
                .thenThrow(new HypofitException(
                        "social_provider_notification_invalid",
                        "Apple 로그인 알림을 확인하지 못했어요.",
                        400,
                        "Invalid Apple notification signature or claims"
                ));

        mockMvc.perform(post("/api/v1/auth/social/apple/notifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payload":"signed-payload"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(header().exists(RequestIdContext.REQUEST_ID_HEADER))
                .andExpect(jsonPath("$.error.code").value("social_provider_notification_invalid"))
                .andExpect(jsonPath("$.error.message").value("Apple 로그인 알림을 확인하지 못했어요."));
    }

    @Test
    void protectedSocialRouteStillRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/auth/social/identities"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists(RequestIdContext.REQUEST_ID_HEADER))
                .andExpect(jsonPath("$.error.code").value("auth_required"));
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EnableConfigurationProperties(HypofitProperties.class)
    @Import({
            SocialAuthController.class,
            SocialAuthSecurityConfiguration.class,
            ApiExceptionHandler.class,
            HypofitBearerTokenAuthenticationEntryPoint.class,
            RequestIdFilter.class
    })
    static class TestApplication {

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }
}
