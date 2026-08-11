package com.contentruck.hypofit.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidationException;

class HypofitJwtDecoderTest {

    private static final String AUDIENCE = "authenticated";
    private static final String SIGNING_SECRET = "test-secret-test-secret-test-secret-1234";
    private static final String DIFFERENT_SECRET = "different-secret-different-secret-123";
    private static final Instant VALID_ISSUED_AT = Instant.parse("2030-08-04T02:59:00Z");
    private static final Instant VALID_EXPIRES_AT = Instant.parse("2030-08-04T03:10:00Z");
    private static final Instant EXPIRED_ISSUED_AT = Instant.parse("2020-08-04T02:00:00Z");
    private static final Instant EXPIRED_EXPIRES_AT = Instant.parse("2020-08-04T03:00:00Z");

    @Test
    void decodesHs256TokenWhenSecretConfigurationIsPresent() throws Exception {
        HypofitJwtDecoder decoder = new HypofitJwtDecoder(propertiesWithSecret(SIGNING_SECRET));

        Jwt decoded = decoder.decode(token(
                SIGNING_SECRET,
                List.of(AUDIENCE),
                VALID_ISSUED_AT,
                VALID_EXPIRES_AT
        ));

        assertEquals("user-123", decoded.getSubject());
        assertEquals(List.of(AUDIENCE), decoded.getAudience());
        assertEquals("authenticated", decoded.getClaimAsString("role"));
    }

    @Test
    void rejectsTokenWithWrongAudience() throws Exception {
        HypofitJwtDecoder decoder = new HypofitJwtDecoder(propertiesWithSecret(SIGNING_SECRET));

        JwtValidationException exception = assertThrows(
                JwtValidationException.class,
                () -> decoder.decode(token(
                        SIGNING_SECRET,
                        List.of("wrong-audience"),
                        VALID_ISSUED_AT,
                        VALID_EXPIRES_AT
                ))
        );

        assertTrue(exception.getErrors().stream()
                .map(error -> error.getDescription())
                .anyMatch("Missing required audience"::equals));
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        HypofitJwtDecoder decoder = new HypofitJwtDecoder(propertiesWithSecret(SIGNING_SECRET));

        JwtValidationException exception = assertThrows(
                JwtValidationException.class,
                () -> decoder.decode(token(
                        SIGNING_SECRET,
                        List.of(AUDIENCE),
                        EXPIRED_ISSUED_AT,
                        EXPIRED_EXPIRES_AT
                ))
        );

        assertTrue(exception.getErrors().stream()
                .map(error -> error.getDescription())
                .filter(description -> description != null)
                .anyMatch(description -> description.toLowerCase(java.util.Locale.ROOT).contains("expired")));
    }

    @Test
    void rejectsTokenWithBadSignature() throws Exception {
        HypofitJwtDecoder decoder = new HypofitJwtDecoder(propertiesWithSecret(SIGNING_SECRET));

        JwtException exception = assertThrows(
                JwtException.class,
                () -> decoder.decode(token(
                        DIFFERENT_SECRET,
                        List.of(AUDIENCE),
                        VALID_ISSUED_AT,
                        VALID_EXPIRES_AT
                ))
        );

        assertTrue(exception.getMessage() != null && !exception.getMessage().isBlank());
    }

    @Test
    void failsFastWhenNoJwtVerificationConfigurationExists() {
        HypofitProperties properties = new HypofitProperties();
        properties.setJwtAudience(AUDIENCE);

        HypofitJwtDecoder decoder = new HypofitJwtDecoder(properties);

        JwtException exception = assertThrows(JwtException.class, () -> decoder.decode("unused-token"));
        assertEquals("Supabase JWT verification is not configured", exception.getMessage());
    }

    private HypofitProperties propertiesWithSecret(String secret) {
        HypofitProperties properties = new HypofitProperties();
        properties.setJwtAudience(AUDIENCE);
        properties.setSupabaseJwtSecret(secret);
        return properties;
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
                        .subject("user-123")
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
