package com.contentruck.hypofit.socialauth.application;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.config.AppleSignInNotificationProperties;
import com.contentruck.hypofit.socialauth.persistence.SocialAuthIdentityEntity;
import com.contentruck.hypofit.socialauth.web.AppleSignInNotificationAccepted;
import com.contentruck.hypofit.socialauth.web.AppleSignInNotificationReceive;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.security.interfaces.ECPublicKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AppleSignInNotificationService {

    static final String APPLE_SIGN_IN_ISSUER = "https://appleid.apple.com";
    static final Set<String> ALLOWED_EVENT_TYPES = Set.of(
            "email-enabled",
            "email-disabled",
            "consent-revoked",
            "account-deleted"
    );
    static final Set<String> SUPPORTED_JWKS_ALGORITHMS = Set.of("ES256", "RS256");
    static final long IAT_CLOCK_SKEW_SECONDS = 300L;

    private final SocialAuthRepository repository;
    private final AppleSignInJwksClient jwksClient;
    private final HypofitProperties properties;
    private final AppleSignInNotificationProperties appleProperties;

    private final Object cacheMonitor = new Object();
    private volatile long jwksCacheExpiresAtEpochSecond = 0L;
    private volatile Map<String, JWK> cachedKeysById = Map.of();

    public AppleSignInNotificationService(
            SocialAuthRepository repository,
            AppleSignInJwksClient jwksClient,
            HypofitProperties properties,
            AppleSignInNotificationProperties appleProperties
    ) {
        this.repository = repository;
        this.jwksClient = jwksClient;
        this.properties = properties;
        this.appleProperties = appleProperties;
    }

    @Transactional
    public AppleSignInNotificationAccepted processNotification(AppleSignInNotificationReceive request) {
        String payload = request == null || request.payload() == null ? "" : request.payload().trim();
        VerifiedAppleNotification notification = decodeAndValidateSignedPayload(payload);
        String subjectHash = hashIdentityValue(notification.subject());
        String eventIdHash = hashIdentityValue(notification.jti());

        SocialAuthIdentityEntity identity = repository.findIdentityByProviderSubject("apple", subjectHash).orElse(null);
        boolean created = repository.createProviderEvent(
                "apple",
                notification.eventType(),
                subjectHash,
                eventIdHash,
                identity == null ? null : identity.getId()
        );
        if (!created) {
            return accepted();
        }

        if (identity != null) {
            applyNotificationToIdentity(identity, notification);
            recordAuditEvent(identity.getId(), notification);
        }

        return accepted();
    }

    VerifiedAppleNotification decodeAndValidateSignedPayload(String payload) {
        String appId = appleSignInAppId();
        SignedJWT signedJwt;
        try {
            signedJwt = SignedJWT.parse(payload);
        } catch (Exception exception) {
            throw invalidNotification("Invalid Apple notification header");
        }

        JWSHeader header = signedJwt.getHeader();
        String keyId = header == null || header.getKeyID() == null ? "" : header.getKeyID().trim();
        String algorithm = header == null || header.getAlgorithm() == null ? "" : header.getAlgorithm().getName().trim();
        if (!StringUtils.hasText(keyId) || !SUPPORTED_JWKS_ALGORITHMS.contains(algorithm)) {
            throw invalidNotification("Unsupported Apple notification header");
        }

        JWK jwk = getJwk(keyId);
        String keyAlgorithm = jwk.getAlgorithm() == null ? algorithm : jwk.getAlgorithm().getName().trim();
        if (!SUPPORTED_JWKS_ALGORITHMS.contains(keyAlgorithm)) {
            throw invalidNotification("Unsupported Apple notification key algorithm");
        }

        if (!verifySignature(signedJwt, jwk)) {
            throw invalidNotification("Invalid Apple notification signature or claims");
        }

        JWTClaimsSet claims;
        try {
            claims = signedJwt.getJWTClaimsSet();
        } catch (Exception exception) {
            throw invalidNotification("Invalid Apple notification signature or claims");
        }

        validateIssuer(claims.getIssuer());
        validateAudience(claims.getAudience(), appId);
        OffsetDateTime issuedAt = validatedIat(claims.getIssueTime());
        String jti = requiredString(claims.getJWTID(), "jti");

        Object eventsValue = claims.getClaim("events");
        if (!(eventsValue instanceof Map<?, ?> events)) {
            throw invalidNotification("Apple notification events claim must be an object");
        }
        String eventType = requiredString(events.get("type"), "events.type");
        if (!ALLOWED_EVENT_TYPES.contains(eventType)) {
            throw invalidNotification("Unsupported Apple notification event type");
        }
        String subject = requiredString(events.get("sub"), "events.sub");
        return new VerifiedAppleNotification(eventType, subject, jti, issuedAt);
    }

    private void applyNotificationToIdentity(
            SocialAuthIdentityEntity identity,
            VerifiedAppleNotification notification
    ) {
        if ("email-enabled".equals(notification.eventType()) || "email-disabled".equals(notification.eventType())) {
            repository.setIdentityEmailForwarding(identity, notification.emailForwardingEnabled());
            return;
        }

        repository.setIdentityEmailForwarding(identity, notification.emailForwardingEnabled());
        repository.revokeIdentity(identity, notification.issuedAt());
    }

    private void recordAuditEvent(UUID identityId, VerifiedAppleNotification notification) {
        Map<String, Object> metadata = new java.util.LinkedHashMap<>();
        metadata.put("provider", "apple");
        metadata.put("notification_type", notification.eventType());
        if (notification.emailForwardingEnabled() != null) {
            metadata.put("email_forwarding_enabled", notification.emailForwardingEnabled());
        }
        repository.recordAuditEvent(
                null,
                "system",
                "social_auth_apple_notification_applied",
                "social_auth_identity",
                identityId,
                null,
                metadata
        );
    }

    private JWK getJwk(String keyId) {
        long now = Instant.now().getEpochSecond();
        Map<String, JWK> keys = cachedKeysById;
        if (now >= jwksCacheExpiresAtEpochSecond || !keys.containsKey(keyId)) {
            synchronized (cacheMonitor) {
                long refreshedNow = Instant.now().getEpochSecond();
                if (refreshedNow >= jwksCacheExpiresAtEpochSecond || !cachedKeysById.containsKey(keyId)) {
                    cachedKeysById = jwksClient.fetchKeys();
                    jwksCacheExpiresAtEpochSecond = refreshedNow + jwksCacheSeconds();
                }
                keys = cachedKeysById;
            }
        }

        JWK jwk = keys.get(keyId);
        if (jwk == null) {
            throw invalidNotification("Unknown Apple notification key");
        }
        return jwk;
    }

    private boolean verifySignature(SignedJWT signedJwt, JWK jwk) {
        try {
            JWSVerifier verifier = verifierFor(jwk);
            return signedJwt.verify(verifier);
        } catch (Exception exception) {
            throw invalidNotification("Invalid Apple notification signature or claims");
        }
    }

    private JWSVerifier verifierFor(JWK jwk) throws Exception {
        if (jwk instanceof ECKey ecKey) {
            if (!Curve.P_256.equals(ecKey.getCurve())) {
                throw invalidNotification("Unsupported Apple notification key algorithm");
            }
            ECPublicKey publicKey = ecKey.toECPublicKey();
            return new ECDSAVerifier(publicKey);
        }
        if (jwk instanceof RSAKey rsaKey) {
            RSAPublicKey publicKey = rsaKey.toRSAPublicKey();
            return new RSASSAVerifier(publicKey);
        }
        throw invalidNotification("Unsupported Apple notification key algorithm");
    }

    private void validateIssuer(String issuer) {
        if (!APPLE_SIGN_IN_ISSUER.equals(issuer)) {
            throw invalidNotification("Invalid Apple notification signature or claims");
        }
    }

    private void validateAudience(java.util.List<String> audience, String appId) {
        if (audience == null || audience.stream().noneMatch(appId::equals)) {
            throw invalidNotification("Invalid Apple notification signature or claims");
        }
    }

    private OffsetDateTime validatedIat(java.util.Date issueTime) {
        if (issueTime == null) {
            throw invalidNotification("Apple notification iat is invalid");
        }
        OffsetDateTime issuedAt = OffsetDateTime.ofInstant(issueTime.toInstant(), ZoneOffset.UTC);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (issuedAt.isAfter(now.plusSeconds(IAT_CLOCK_SKEW_SECONDS))) {
            throw invalidNotification("Apple notification iat is in the future");
        }
        return issuedAt;
    }

    private String requiredString(Object value, String claim) {
        if (!(value instanceof String stringValue)) {
            throw invalidNotification("Apple notification claim " + claim + " is invalid");
        }
        String normalized = stringValue.trim();
        if (!StringUtils.hasText(normalized)) {
            throw invalidNotification("Apple notification claim " + claim + " is blank");
        }
        return normalized;
    }

    private String hashIdentityValue(String value) {
        String pepper = properties.getSocialAuthIdentityPepper();
        if (!StringUtils.hasText(pepper)) {
            throw unavailable("Social auth identity pepper is missing");
        }
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
            throw new IllegalStateException("Failed to compute social auth HMAC", exception);
        }
    }

    private String appleSignInAppId() {
        String value = appleProperties.getAppId() == null ? "" : appleProperties.getAppId().trim();
        if (!StringUtils.hasText(value)) {
            throw unavailable("Apple Sign in App ID is not configured");
        }
        return value;
    }

    private long jwksCacheSeconds() {
        try {
            return Math.max(appleProperties.getJwksCacheSeconds(), 0);
        } catch (Exception exception) {
            throw unavailable("Apple Sign in JWKS cache seconds are invalid");
        }
    }

    private HypofitException invalidNotification(String debugMessage) {
        return new HypofitException(
                "social_provider_notification_invalid",
                "Apple 로그인 알림을 확인하지 못했어요.",
                HttpStatus.BAD_REQUEST.value(),
                debugMessage
        );
    }

    private HypofitException unavailable(String debugMessage) {
        return new HypofitException(
                "social_provider_unavailable",
                "Apple 로그인 알림 처리 설정을 확인하지 못했어요.",
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                debugMessage
        );
    }

    private AppleSignInNotificationAccepted accepted() {
        return AppleSignInNotificationAccepted.accepted();
    }

    record VerifiedAppleNotification(
            String eventType,
            String subject,
            String jti,
            OffsetDateTime issuedAt
    ) {
        Boolean emailForwardingEnabled() {
            return switch (eventType) {
                case "email-enabled" -> Boolean.TRUE;
                case "email-disabled", "consent-revoked", "account-deleted" -> Boolean.FALSE;
                default -> null;
            };
        }
    }
}
