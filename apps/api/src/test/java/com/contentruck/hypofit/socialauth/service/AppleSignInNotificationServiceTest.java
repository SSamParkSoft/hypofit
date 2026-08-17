package com.contentruck.hypofit.socialauth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.config.AppleSignInNotificationProperties;
import com.contentruck.hypofit.socialauth.entity.SocialAuthIdentityEntity;
import com.contentruck.hypofit.socialauth.dto.AppleSignInNotificationAccepted;
import com.contentruck.hypofit.socialauth.dto.AppleSignInNotificationReceive;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.Map;
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
class AppleSignInNotificationServiceTest {

    @Mock
    private SocialAuthRepository repository;

    @Mock
    private AppleSignInJwksClient jwksClient;

    private AppleSignInNotificationService service;
    private ECKey appleKey;

    @BeforeEach
    void setUp() throws Exception {
        HypofitProperties properties = new HypofitProperties();
        properties.setSocialAuthIdentityPepper("identity-test-pepper");

        AppleSignInNotificationProperties appleProperties = new AppleSignInNotificationProperties();
        appleProperties.setAppId("com.contentruck.hypofit");
        appleProperties.setJwksUrl("https://appleid.apple.com/auth/keys");
        appleProperties.setJwksCacheSeconds(300);

        service = new AppleSignInNotificationService(repository, jwksClient, properties, appleProperties);
        appleKey = generateAppleEcKey("apple-key-1");
    }

    @Test
    void processNotificationAcceptsValidEmailEnabledEvent() throws Exception {
        SocialAuthIdentityEntity identity = identity();
        when(jwksClient.fetchKeys()).thenReturn(Map.of("apple-key-1", appleKey.toPublicJWK()));
        when(repository.findIdentityByProviderSubject("apple", hmac("apple-user-1", "identity-test-pepper")))
                .thenReturn(Optional.of(identity));
        when(repository.createProviderEvent(
                "apple",
                "email-enabled",
                hmac("apple-user-1", "identity-test-pepper"),
                hmac("notification-1", "identity-test-pepper"),
                identity.getId()
        )).thenReturn(true);

        AppleSignInNotificationAccepted result = service.processNotification(
                new AppleSignInNotificationReceive(signedPayload(
                        appleKey,
                        "notification-1",
                        "email-enabled",
                        "apple-user-1",
                        OffsetDateTime.now(ZoneOffset.UTC)
                ))
        );

        assertThat(result.status()).isEqualTo("accepted");
        verify(repository).setIdentityEmailForwarding(identity, Boolean.TRUE);
        verify(repository).recordAuditEvent(
                eq(null),
                eq("system"),
                eq("social_auth_apple_notification_applied"),
                eq("social_auth_identity"),
                eq(identity.getId()),
                eq(null),
                any()
        );
    }

    @Test
    void processNotificationRevokesIdentityForConsentRevoked() throws Exception {
        SocialAuthIdentityEntity identity = identity();
        OffsetDateTime issuedAt = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2).withNano(0);
        when(jwksClient.fetchKeys()).thenReturn(Map.of("apple-key-1", appleKey.toPublicJWK()));
        when(repository.findIdentityByProviderSubject("apple", hmac("apple-user-2", "identity-test-pepper")))
                .thenReturn(Optional.of(identity));
        when(repository.createProviderEvent(
                "apple",
                "consent-revoked",
                hmac("apple-user-2", "identity-test-pepper"),
                hmac("notification-revoked", "identity-test-pepper"),
                identity.getId()
        )).thenReturn(true);

        service.processNotification(new AppleSignInNotificationReceive(
                signedPayload(appleKey, "notification-revoked", "consent-revoked", "apple-user-2", issuedAt)
        ));

        verify(repository).setIdentityEmailForwarding(identity, Boolean.FALSE);
        verify(repository).revokeIdentity(identity, issuedAt);
    }

    @Test
    void duplicateNotificationRemainsIdempotentAndReusesCachedJwks() throws Exception {
        SocialAuthIdentityEntity identity = identity();
        when(jwksClient.fetchKeys()).thenReturn(Map.of("apple-key-1", appleKey.toPublicJWK()));
        when(repository.findIdentityByProviderSubject("apple", hmac("apple-user-3", "identity-test-pepper")))
                .thenReturn(Optional.of(identity));
        when(repository.createProviderEvent(
                "apple",
                "email-disabled",
                hmac("apple-user-3", "identity-test-pepper"),
                hmac("notification-duplicate", "identity-test-pepper"),
                identity.getId()
        )).thenReturn(true).thenReturn(false);

        AppleSignInNotificationReceive request = new AppleSignInNotificationReceive(
                signedPayload(
                        appleKey,
                        "notification-duplicate",
                        "email-disabled",
                        "apple-user-3",
                        OffsetDateTime.now(ZoneOffset.UTC)
                )
        );

        service.processNotification(request);
        service.processNotification(request);

        verify(jwksClient, times(1)).fetchKeys();
        verify(repository, times(1)).setIdentityEmailForwarding(identity, Boolean.FALSE);
        verify(repository, times(1)).recordAuditEvent(
                eq(null),
                eq("system"),
                eq("social_auth_apple_notification_applied"),
                eq("social_auth_identity"),
                eq(identity.getId()),
                eq(null),
                any()
        );
    }

    @Test
    void missingIdentityIsStillAccepted() throws Exception {
        when(jwksClient.fetchKeys()).thenReturn(Map.of("apple-key-1", appleKey.toPublicJWK()));
        when(repository.findIdentityByProviderSubject("apple", hmac("apple-user-4", "identity-test-pepper")))
                .thenReturn(Optional.empty());
        when(repository.createProviderEvent(
                "apple",
                "account-deleted",
                hmac("apple-user-4", "identity-test-pepper"),
                hmac("notification-missing-identity", "identity-test-pepper"),
                null
        )).thenReturn(true);

        AppleSignInNotificationAccepted result = service.processNotification(
                new AppleSignInNotificationReceive(signedPayload(
                        appleKey,
                        "notification-missing-identity",
                        "account-deleted",
                        "apple-user-4",
                        OffsetDateTime.now(ZoneOffset.UTC)
                ))
        );

        assertThat(result.status()).isEqualTo("accepted");
        verify(repository, never()).setIdentityEmailForwarding(any(), any());
        verify(repository, never()).recordAuditEvent(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void invalidSignatureReturnsSocialNotificationInvalid() throws Exception {
        ECKey otherKey = generateAppleEcKey("apple-key-1");
        when(jwksClient.fetchKeys()).thenReturn(Map.of("apple-key-1", otherKey.toPublicJWK()));

        assertThatThrownBy(() -> service.processNotification(
                new AppleSignInNotificationReceive(signedPayload(
                        appleKey,
                        "notification-bad-signature",
                        "email-enabled",
                        "apple-user-5",
                        OffsetDateTime.now(ZoneOffset.UTC)
                ))
        )).isInstanceOf(HypofitException.class)
                .satisfies(error -> {
                    HypofitException exception = (HypofitException) error;
                    assertThat(exception.getCode()).isEqualTo("social_provider_notification_invalid");
                    assertThat(exception.getStatus()).isEqualTo(400);
                });
    }

    @Test
    void repeatedUnknownKeyDoesNotRepeatedlyRefreshJwks() throws Exception {
        ECKey unknownKey = generateAppleEcKey("unknown-key");
        when(jwksClient.fetchKeys()).thenReturn(Map.of("apple-key-1", appleKey.toPublicJWK()));
        AppleSignInNotificationReceive request = new AppleSignInNotificationReceive(signedPayload(
                unknownKey,
                "notification-unknown-key",
                "email-enabled",
                "apple-user-unknown-key",
                OffsetDateTime.now(ZoneOffset.UTC)
        ));

        assertThatThrownBy(() -> service.processNotification(request))
                .isInstanceOf(HypofitException.class);
        assertThatThrownBy(() -> service.processNotification(request))
                .isInstanceOf(HypofitException.class);

        verify(jwksClient, times(1)).fetchKeys();
    }

    @Test
    void jwksFailureReturnsSocialProviderUnavailable() throws Exception {
        when(jwksClient.fetchKeys()).thenThrow(new HypofitException(
                "social_provider_unavailable",
                "Apple 로그인 알림 처리 설정을 확인하지 못했어요.",
                503,
                "Apple notification JWKS fetch failed"
        ));

        assertThatThrownBy(() -> service.processNotification(
                new AppleSignInNotificationReceive(signedPayload(
                        appleKey,
                        "notification-jwks-down",
                        "email-enabled",
                        "apple-user-7",
                        OffsetDateTime.now(ZoneOffset.UTC)
                ))
        )).isInstanceOf(HypofitException.class)
                .satisfies(error -> {
                    HypofitException exception = (HypofitException) error;
                    assertThat(exception.getCode()).isEqualTo("social_provider_unavailable");
                    assertThat(exception.getStatus()).isEqualTo(503);
                });
    }

    @Test
    void decodeRejectsFutureIatOutsideClockSkew() throws Exception {
        when(jwksClient.fetchKeys()).thenReturn(Map.of("apple-key-1", appleKey.toPublicJWK()));

        assertThatThrownBy(() -> service.decodeAndValidateSignedPayload(
                signedPayload(
                        appleKey,
                        "notification-future",
                        "email-enabled",
                        "apple-user-6",
                        OffsetDateTime.now(ZoneOffset.UTC).plusSeconds(
                                AppleSignInNotificationService.IAT_CLOCK_SKEW_SECONDS + 30
                        )
                )
        )).isInstanceOf(HypofitException.class)
                .satisfies(error -> assertThat(((HypofitException) error).getCode())
                        .isEqualTo("social_provider_notification_invalid"));
    }

    private static SocialAuthIdentityEntity identity() {
        SocialAuthIdentityEntity entity = new SocialAuthIdentityEntity();
        entity.setId(UUID.randomUUID());
        entity.setUserId(UUID.randomUUID());
        entity.setProvider("apple");
        entity.setStatus("active");
        entity.setLinkedAt(OffsetDateTime.now(ZoneOffset.UTC).minusDays(1));
        entity.setProviderSubjectHash("subject-hash");
        entity.setSupabaseIdentityId("supabase-identity-id");
        return entity;
    }

    private static ECKey generateAppleEcKey(String keyId) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair keyPair = generator.generateKeyPair();
        return new ECKey.Builder(Curve.P_256, (java.security.interfaces.ECPublicKey) keyPair.getPublic())
                .privateKey((java.security.interfaces.ECPrivateKey) keyPair.getPrivate())
                .algorithm(JWSAlgorithm.ES256)
                .keyID(keyId)
                .build();
    }

    private static String signedPayload(
            ECKey ecKey,
            String jti,
            String eventType,
            String subject,
            OffsetDateTime issuedAt
    ) throws JOSEException {
        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.ES256)
                        .keyID(ecKey.getKeyID())
                        .build(),
                new JWTClaimsSet.Builder()
                        .issuer(AppleSignInNotificationService.APPLE_SIGN_IN_ISSUER)
                        .audience("com.contentruck.hypofit")
                        .issueTime(Date.from(issuedAt.toInstant()))
                        .jwtID(jti)
                        .claim("events", Map.of(
                                "type", eventType,
                                "sub", subject
                        ))
                        .build()
        );
        jwt.sign(new ECDSASigner(ecKey));
        return jwt.serialize();
    }

    private static String hmac(String value, String pepper) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder(digest.length * 2);
        for (byte item : digest) {
            builder.append(String.format("%02x", item));
        }
        return builder.toString();
    }
}
