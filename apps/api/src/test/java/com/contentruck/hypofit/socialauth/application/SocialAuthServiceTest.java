package com.contentruck.hypofit.socialauth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.domain.SocialAuthReadModels;
import com.contentruck.hypofit.socialauth.persistence.SocialAuthAttemptEntity;
import com.contentruck.hypofit.socialauth.persistence.SocialAuthIdentityEntity;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SocialAuthServiceTest {

    @Mock
    private SocialAuthRepository repository;

    @Mock
    private SocialAuthAdminClient authAdminClient;

    @Mock
    private SocialAuthAttemptStateWriter attemptStateWriter;

    private SocialAuthService service;

    @BeforeEach
    void setUp() {
        HypofitProperties properties = new HypofitProperties();
        properties.setSocialAuthEnabled(true);
        properties.setSocialAuthAttemptPepper("attempt-pepper");
        properties.setSocialAuthIdentityPepper("identity-pepper");
        properties.setSocialAuthAppleState("available");
        properties.setSocialAuthAppleIosState("available");
        properties.setSocialAuthAppleWebState("review_pending");
        properties.setSocialAuthGoogleState("available");
        properties.setSocialAuthKakaoState("disabled");
        properties.setSocialAuthNaverState("available");
        service = new SocialAuthService(repository, authAdminClient, attemptStateWriter, properties, 600);
    }

    @Test
    void getCapabilitiesAppliesApplePlatformRules() {
        SocialAuthReadModels.CapabilitiesReadModel result = service.getCapabilities("android");

        assertThat(result.providers())
                .extracting(SocialAuthReadModels.ProviderCapability::provider, SocialAuthReadModels.ProviderCapability::state)
                .contains(
                        tuple("apple", "unsupported_platform"),
                        tuple("google", "available"),
                        tuple("kakao", "disabled"),
                        tuple("naver", "available")
                );
    }

    @Test
    void createAttemptRejectsNonLoginFlow() {
        assertThatThrownBy(() -> service.createAttempt("google", "web", "link", "/app"))
                .isInstanceOf(HypofitException.class)
                .satisfies(error -> {
                    HypofitException exception = (HypofitException) error;
                    assertThat(exception.getCode()).isEqualTo("auth_required");
                    assertThat(exception.getUserMessage()).isEqualTo("로그인 후 연결할 수 있어요.");
                });
    }

    @Test
    void createAttemptPersistsPendingAttemptWithSanitizedReturnPath() {
        when(repository.createAttempt(any(SocialAuthAttemptEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SocialAuthReadModels.AttemptReadModel result = service.createAttempt("google", "web", null, " /app/chat ");

        assertThat(result.flow()).isEqualTo("login");
        assertThat(result.returnPath()).isEqualTo("/app/chat");
        assertThat(result.attemptSecret()).hasSizeGreaterThanOrEqualTo(32);
        verify(repository).createAttempt(any(SocialAuthAttemptEntity.class));
    }

    @Test
    void listIdentitiesRequiresActiveProfile() {
        UUID userId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listIdentities(userId))
                .isInstanceOf(HypofitException.class)
                .satisfies(error -> assertThat(((HypofitException) error).getCode()).isEqualTo("profile_missing"));
    }

    @Test
    void createLinkAttemptRequiresActiveProfileAndStoresBoundUser() {
        UUID userId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.createAttempt(any(SocialAuthAttemptEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SocialAuthReadModels.AttemptReadModel result = service.createLinkAttempt(userId, "naver", "ios", "/(tabs)/profile");

        assertThat(result.flow()).isEqualTo("link");
        assertThat(result.platform()).isEqualTo("ios");
        verify(repository).createAttempt(any(SocialAuthAttemptEntity.class));
    }

    @Test
    void completeAttemptReturnsRoleOnboardingWhenVerifiedEmailHasNoOwner() {
        UUID authUserId = UUID.randomUUID();
        AttemptFixture attempt = attempt("google", "login", "pending", null);
        when(repository.findAttemptForUpdate(attempt.entity().getId())).thenReturn(Optional.of(attempt.entity()));
        when(repository.findUserAccount(authUserId)).thenReturn(Optional.empty());
        when(repository.findUserAccountByEmail("founder@example.com")).thenReturn(Optional.empty());
        when(authAdminClient.getAuthUser(authUserId)).thenReturn(adminUser(
                verifiedIdentity("google", "google-subject", "google-identity-id", "founder@example.com", true)
        ));

        SocialAuthReadModels.CompleteReadModel result = service.completeAttempt(
                authUserId,
                attempt.entity().getId(),
                attempt.secret()
        );

        assertThat(result.nextStep()).isEqualTo("role_onboarding_required");
        assertThat(result.identity().email()).isEqualTo("founder@example.com");
        verify(repository).recordAuditEvent(
                eq(authUserId),
                eq("user"),
                eq("social_auth_completed"),
                eq("social_auth_identity"),
                eq(null),
                eq(null),
                any()
        );
    }

    @Test
    void completeAttemptCompletesSignedInAndReconcilesIdentityInventory() {
        UUID authUserId = UUID.randomUUID();
        OffsetDateTime linkedAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(2);
        AttemptFixture attempt = attempt("google", "login", "pending", null);
        SocialAuthIdentityEntity googleIdentity = identity(
                authUserId,
                "google",
                "active",
                linkedAt,
                "google-subject-hash",
                "google-identity-id"
        );
        SocialAuthIdentityEntity kakaoIdentity = identity(
                authUserId,
                "kakao",
                "active",
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
                "kakao-subject-hash",
                "kakao-identity-id"
        );

        when(repository.findAttemptForUpdate(attempt.entity().getId())).thenReturn(Optional.of(attempt.entity()));
        when(repository.findUserAccount(authUserId)).thenReturn(Optional.of(activeUser(authUserId)));
        when(authAdminClient.getAuthUser(authUserId)).thenReturn(adminUser(
                verifiedIdentity("google", "google-subject", "google-identity-id", "founder@example.com", true)
        ));
        when(repository.listUserIdentities(authUserId))
                .thenReturn(List.of(googleIdentity, kakaoIdentity))
                .thenReturn(List.of(googleIdentity, kakaoIdentity));
        when(repository.findIdentityByProviderSubject("google", hmac("google-subject", "identity-pepper")))
                .thenReturn(Optional.of(googleIdentity));
        when(repository.upsertIdentity(
                eq(googleIdentity),
                eq(authUserId),
                eq("google"),
                eq(hmac("google-subject", "identity-pepper")),
                eq("google-identity-id"),
                eq("founder@example.com"),
                eq(Boolean.TRUE),
                any(OffsetDateTime.class)
        )).thenAnswer(invocation -> {
            googleIdentity.setProviderEmail("founder@example.com");
            googleIdentity.setProviderEmailVerified(Boolean.TRUE);
            googleIdentity.setStatus("active");
            googleIdentity.setLastUsedAt(invocation.getArgument(7));
            googleIdentity.setRevokedAt(null);
            return googleIdentity;
        });

        SocialAuthReadModels.CompleteReadModel result = service.completeAttempt(
                authUserId,
                attempt.entity().getId(),
                attempt.secret()
        );

        assertThat(result.nextStep()).isEqualTo("signed_in");
        assertThat(result.identity().provider()).isEqualTo("google");
        assertThat(attempt.entity().getStatus()).isEqualTo("completed");
        verify(repository).revokeIdentity(eq(kakaoIdentity), any(OffsetDateTime.class));
        verify(repository).recordAuditEvent(
                eq(authUserId),
                eq("user"),
                eq("social_auth_completed"),
                eq("social_auth_identity"),
                eq(googleIdentity.getId()),
                eq(null),
                any()
        );
    }

    @Test
    void completeAttemptRejectsIdentityConflictAcrossAccounts() {
        UUID authUserId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        AttemptFixture attempt = attempt("google", "link", "pending", authUserId);
        SocialAuthIdentityEntity conflictingIdentity = identity(
                otherUserId,
                "google",
                "active",
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
                hmac("stable-google-subject", "identity-pepper"),
                "google-identity-id"
        );

        when(repository.findAttemptForUpdate(attempt.entity().getId())).thenReturn(Optional.of(attempt.entity()));
        when(repository.findUserAccount(authUserId)).thenReturn(Optional.of(activeUser(authUserId)));
        when(authAdminClient.getAuthUser(authUserId)).thenReturn(adminUser(
                verifiedIdentity("google", "stable-google-subject", "google-identity-id", "owner@example.com", true)
        ));
        when(repository.listUserIdentities(authUserId)).thenReturn(List.of());
        when(repository.findIdentityByProviderSubject("google", hmac("stable-google-subject", "identity-pepper")))
                .thenReturn(Optional.of(conflictingIdentity));

        assertThatThrownBy(() -> service.completeAttempt(authUserId, attempt.entity().getId(), attempt.secret()))
                .isInstanceOf(HypofitException.class)
                .satisfies(error -> assertThat(((HypofitException) error).getCode()).isEqualTo("social_identity_conflict"));
    }

    @Test
    void completeAttemptMarksExpiredAttemptsBeforeRejecting() {
        UUID authUserId = UUID.randomUUID();
        AttemptFixture attempt = attempt("google", "login", "pending", null);
        attempt.entity().setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        when(repository.findAttemptForUpdate(attempt.entity().getId())).thenReturn(Optional.of(attempt.entity()));

        assertThatThrownBy(() -> service.completeAttempt(authUserId, attempt.entity().getId(), attempt.secret()))
                .isInstanceOf(HypofitException.class)
                .satisfies(error -> assertThat(((HypofitException) error).getCode()).isEqualTo("social_callback_expired"));

        verify(attemptStateWriter).markExpired(attempt.entity().getId());
    }

    @Test
    void reconcileIdentitiesRevokesRemovedInventoryEntries() {
        UUID authUserId = UUID.randomUUID();
        SocialAuthIdentityEntity googleIdentity = identity(
                authUserId,
                "google",
                "active",
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(2),
                hmac("stable-google-subject", "identity-pepper"),
                "google-identity-id"
        );
        SocialAuthIdentityEntity kakaoIdentity = identity(
                authUserId,
                "kakao",
                "active",
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
                hmac("old-kakao-subject", "identity-pepper"),
                "kakao-identity-id"
        );

        when(repository.findUserAccount(authUserId)).thenReturn(Optional.of(activeUser(authUserId)));
        when(authAdminClient.getAuthUser(authUserId)).thenReturn(adminUser(
                verifiedIdentity("google", "stable-google-subject", "google-identity-id", "owner@example.com", true)
        ));
        when(repository.listUserIdentities(authUserId))
                .thenReturn(List.of(googleIdentity, kakaoIdentity))
                .thenReturn(List.of(googleIdentity, kakaoIdentity));
        when(repository.findIdentityByProviderSubject("google", hmac("stable-google-subject", "identity-pepper")))
                .thenReturn(Optional.of(googleIdentity));
        when(repository.upsertIdentity(
                eq(googleIdentity),
                eq(authUserId),
                eq("google"),
                eq(hmac("stable-google-subject", "identity-pepper")),
                eq("google-identity-id"),
                eq("owner@example.com"),
                eq(Boolean.TRUE),
                any(OffsetDateTime.class)
        )).thenAnswer(invocation -> googleIdentity);

        SocialAuthReadModels.IdentityReconcileReadModel result = service.reconcileIdentities(authUserId, authUserId);

        assertThat(result.revokedProviders()).containsExactly("kakao");
        verify(repository).revokeIdentity(eq(kakaoIdentity), any(OffsetDateTime.class));
    }

    @Test
    void completedLinkAttemptReplayRemainsIdempotent() {
        UUID authUserId = UUID.randomUUID();
        AttemptFixture attempt = attempt("google", "link", "completed", authUserId);
        SocialAuthIdentityEntity googleIdentity = identity(
                authUserId,
                "google",
                "active",
                OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
                hmac("stable-google-subject", "identity-pepper"),
                "google-identity-id"
        );
        attempt.entity().setResultNextStep("signed_in");
        attempt.entity().setResultEmail("owner@example.com");
        attempt.entity().setResultEmailVerified(Boolean.TRUE);
        attempt.entity().setCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));

        when(repository.findAttemptForUpdate(attempt.entity().getId())).thenReturn(Optional.of(attempt.entity()));
        when(repository.findUserAccount(authUserId)).thenReturn(Optional.of(activeUser(authUserId)));
        when(authAdminClient.getAuthUser(authUserId)).thenReturn(adminUser(
                verifiedIdentity("google", "stable-google-subject", "google-identity-id", "owner@example.com", true)
        ));
        when(repository.listUserIdentities(authUserId))
                .thenReturn(List.of(googleIdentity))
                .thenReturn(List.of(googleIdentity));
        when(repository.findIdentityByProviderSubject("google", hmac("stable-google-subject", "identity-pepper")))
                .thenReturn(Optional.of(googleIdentity));
        when(repository.upsertIdentity(
                eq(googleIdentity),
                eq(authUserId),
                eq("google"),
                eq(hmac("stable-google-subject", "identity-pepper")),
                eq("google-identity-id"),
                eq("owner@example.com"),
                eq(Boolean.TRUE),
                any(OffsetDateTime.class)
        )).thenReturn(googleIdentity);

        SocialAuthReadModels.CompleteReadModel result = service.completeAttempt(
                authUserId,
                attempt.entity().getId(),
                attempt.secret()
        );

        assertThat(result.nextStep()).isEqualTo("signed_in");
        assertThat(result.identity().email()).isEqualTo("owner@example.com");
    }

    private static SocialAuthRepository.UserAccountRecord activeUser(UUID userId) {
        return new SocialAuthRepository.UserAccountRecord(userId, "test@example.com", null, null);
    }

    private static SocialAuthAdminClient.SocialAuthAdminUser adminUser(
            SocialAuthReadModels.VerifiedProviderIdentity... identities
    ) {
        return new SocialAuthAdminClient.SocialAuthAdminUser(List.of(identities));
    }

    private static SocialAuthReadModels.VerifiedProviderIdentity verifiedIdentity(
            String provider,
            String subject,
            String supabaseIdentityId,
            String email,
            Boolean emailVerified
    ) {
        return new SocialAuthReadModels.VerifiedProviderIdentity(
                provider,
                subject,
                supabaseIdentityId,
                email,
                emailVerified
        );
    }

    private static SocialAuthIdentityEntity identity(
            UUID userId,
            String provider,
            String status,
            OffsetDateTime linkedAt,
            String providerSubjectHash,
            String supabaseIdentityId
    ) {
        SocialAuthIdentityEntity entity = new SocialAuthIdentityEntity();
        entity.setId(UUID.randomUUID());
        entity.setUserId(userId);
        entity.setProvider(provider);
        entity.setStatus(status);
        entity.setLinkedAt(linkedAt);
        entity.setProviderSubjectHash(providerSubjectHash);
        entity.setSupabaseIdentityId(supabaseIdentityId);
        entity.setProviderEmail(provider + "@example.com");
        entity.setProviderEmailVerified(Boolean.TRUE);
        return entity;
    }

    private static AttemptFixture attempt(String provider, String flow, String status, UUID authUserId) {
        String attemptSecret = "a".repeat(43);
        SocialAuthAttemptEntity entity = new SocialAuthAttemptEntity();
        entity.setId(UUID.randomUUID());
        entity.setProvider(provider);
        entity.setPlatform("web");
        entity.setFlow(flow);
        entity.setReturnPath("/app");
        entity.setStatus(status);
        entity.setAuthUserId(authUserId);
        entity.setSecretHash(hmac(attemptSecret, "attempt-pepper"));
        entity.setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(5));
        entity.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        entity.setResultEmail(null);
        entity.setResultEmailVerified(null);
        entity.setResultNextStep(null);
        entity.setCompletedAt(null);
        return new AttemptFixture(entity, attemptSecret);
    }

    private static String hmac(String value, String pepper) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                builder.append(String.format("%02x", item));
            }
            return builder.toString();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    @SuppressWarnings("unchecked")
    private static org.assertj.core.groups.Tuple tuple(Object... values) {
        return org.assertj.core.groups.Tuple.tuple(values);
    }

    private record AttemptFixture(
            SocialAuthAttemptEntity entity,
            String secret
    ) {
    }
}
