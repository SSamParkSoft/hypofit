package com.contentruck.hypofit.socialauth.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.error.AuthRequiredException;
import com.contentruck.hypofit.socialauth.application.AppleSignInNotificationService;
import com.contentruck.hypofit.socialauth.application.SocialAuthService;
import com.contentruck.hypofit.socialauth.domain.SocialAuthReadModels;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class SocialAuthControllerTest {

    @Mock
    private SocialAuthService service;

    @Mock
    private AppleSignInNotificationService appleSignInNotificationService;

    @Test
    void createAttemptMapsBodyToService() {
        when(service.createAttempt("google", "web", null, "/app")).thenReturn(new SocialAuthReadModels.AttemptReadModel(
                UUID.randomUUID(),
                "secret-value-123456789012345678901234567890",
                "google",
                "web",
                "login",
                "/app",
                OffsetDateTime.now(ZoneOffset.UTC)
        ));

        SocialAuthController controller = new SocialAuthController(service, appleSignInNotificationService);
        SocialAuthAttemptResponse result = controller.createAttempt(
                new SocialAuthAttemptCreateRequest("google", "web", null, "/app")
        );

        assertThat(result.provider()).isEqualTo("google");
        assertThat(result.flow()).isEqualTo("login");
    }

    @Test
    void listIdentitiesUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        when(service.listIdentities(userId)).thenReturn(new SocialAuthReadModels.IdentityListReadModel(
                List.of(new SocialAuthReadModels.IdentityReadModel(
                        "naver",
                        "naver@example.com",
                        Boolean.TRUE,
                        "active",
                        OffsetDateTime.now(ZoneOffset.UTC)
                ))
        ));

        SocialAuthController controller = new SocialAuthController(service, appleSignInNotificationService);
        SocialIdentityListResponse result = controller.listIdentities(jwt(userId));

        assertThat(result.identities()).hasSize(1);
        assertThat(result.identities().getFirst().provider()).isEqualTo("naver");
    }

    @Test
    void createLinkAttemptUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        when(service.createLinkAttempt(userId, "google", "ios", "/(tabs)/profile")).thenReturn(new SocialAuthReadModels.AttemptReadModel(
                UUID.randomUUID(),
                "secret-value-123456789012345678901234567890",
                "google",
                "ios",
                "link",
                "/(tabs)/profile",
                OffsetDateTime.now(ZoneOffset.UTC)
        ));

        SocialAuthController controller = new SocialAuthController(service, appleSignInNotificationService);
        SocialAuthAttemptResponse result = controller.createLinkAttempt(
                new SocialAuthLinkAttemptCreateRequest("google", "ios", "/(tabs)/profile"),
                jwt(userId)
        );

        assertThat(result.flow()).isEqualTo("link");
        assertThat(result.platform()).isEqualTo("ios");
    }

    @Test
    void completeAttemptUsesJwtSubjectAndRequestBody() {
        UUID userId = UUID.randomUUID();
        UUID attemptId = UUID.randomUUID();
        when(service.completeAttempt(userId, attemptId, "secret-value-123456789012345678901234567890"))
                .thenReturn(new SocialAuthReadModels.CompleteReadModel(
                        new SocialAuthReadModels.IdentityReadModel(
                                "google",
                                "founder@example.com",
                                Boolean.TRUE,
                                "active",
                                OffsetDateTime.now(ZoneOffset.UTC)
                        ),
                        "signed_in",
                        "/app"
                ));

        SocialAuthController controller = new SocialAuthController(service, appleSignInNotificationService);
        SocialAuthCompleteResponse result = controller.completeAttempt(
                new SocialAuthCompleteRequest(attemptId, "secret-value-123456789012345678901234567890"),
                jwt(userId)
        );

        assertThat(result.next_step()).isEqualTo("signed_in");
        assertThat(result.identity().provider()).isEqualTo("google");
    }

    @Test
    void reconcileIdentitiesUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        when(service.reconcileIdentities(userId, userId)).thenReturn(new SocialAuthReadModels.IdentityReconcileReadModel(
                List.of(new SocialAuthReadModels.IdentityReadModel(
                        "naver",
                        "naver@example.com",
                        Boolean.TRUE,
                        "active",
                        OffsetDateTime.now(ZoneOffset.UTC)
                )),
                List.of("kakao"),
                OffsetDateTime.now(ZoneOffset.UTC)
        ));

        SocialAuthController controller = new SocialAuthController(service, appleSignInNotificationService);
        SocialIdentityReconcileResponse result = controller.reconcileIdentities(jwt(userId));

        assertThat(result.identities()).hasSize(1);
        assertThat(result.revoked_providers()).containsExactly("kakao");
    }

    @Test
    void listIdentitiesRequiresJwt() {
        SocialAuthController controller = new SocialAuthController(service, appleSignInNotificationService);

        assertThatThrownBy(() -> controller.listIdentities(null))
                .isInstanceOf(AuthRequiredException.class);
    }

    @Test
    void completeAttemptRequiresJwt() {
        SocialAuthController controller = new SocialAuthController(service, appleSignInNotificationService);

        assertThatThrownBy(() -> controller.completeAttempt(
                new SocialAuthCompleteRequest(UUID.randomUUID(), "secret-value-123456789012345678901234567890"),
                null
        )).isInstanceOf(AuthRequiredException.class);
    }

    @Test
    void receiveAppleNotificationsDelegatesToNotificationService() {
        when(appleSignInNotificationService.processNotification(any(AppleSignInNotificationReceive.class)))
                .thenReturn(AppleSignInNotificationAccepted.accepted());

        SocialAuthController controller = new SocialAuthController(service, appleSignInNotificationService);
        AppleSignInNotificationAccepted result = controller.receiveAppleSignInNotifications(
                new AppleSignInNotificationReceive("signed-payload")
        );

        assertThat(result.status()).isEqualTo("accepted");
    }

    private static Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }
}
