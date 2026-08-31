package com.contentruck.hypofit.common.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import javax.crypto.spec.SecretKeySpec;

import com.contentruck.hypofit.common.config.HypofitProperties;
import org.springframework.cache.Cache;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;

public class HypofitJwtDecoder implements JwtDecoder {

    private final HypofitProperties properties;
    private final JwtDecoder delegate;

    public HypofitJwtDecoder(HypofitProperties properties) {
        this(properties, buildDelegate(properties));
    }

    HypofitJwtDecoder(HypofitProperties properties, JwtDecoder delegate) {
        this.properties = properties;
        this.delegate = delegate;
    }

    @Override
    public Jwt decode(String token) throws JwtException {
        if (delegate == null) {
            throw new JwtException("Supabase JWT verification is not configured");
        }

        try {
            return delegate.decode(token);
        } catch (JwtException exception) {
            if (hasJwksConfiguration() && hasTransportFailure(exception)) {
                return delegate.decode(token);
            }
            throw exception;
        }
    }

    private boolean hasJwksConfiguration() {
        return StringUtils.hasText(properties.getResolvedSupabaseJwksUrl());
    }

    private boolean hasTransportFailure(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof ResourceAccessException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static JwtDecoder buildDelegate(HypofitProperties properties) {
        String jwksUrl = properties.getResolvedSupabaseJwksUrl();
        if (StringUtils.hasText(jwksUrl)) {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUrl)
                    .jwsAlgorithms(algorithms -> {
                        algorithms.add(SignatureAlgorithm.RS256);
                        algorithms.add(SignatureAlgorithm.ES256);
                    })
                    .cache(new ExpiringJwkSetCache(properties.getSupabaseJwksCacheSeconds()))
                    .build();
            decoder.setJwtValidator(validator(properties));
            return decoder;
        }

        if (StringUtils.hasText(properties.getSupabaseJwtSecret())) {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(
                    new SecretKeySpec(properties.getSupabaseJwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256")
            ).macAlgorithm(MacAlgorithm.HS256).build();
            decoder.setJwtValidator(validator(properties));
            return decoder;
        }

        return null;
    }

    private static OAuth2TokenValidator<Jwt> validator(HypofitProperties properties) {
        String audience = properties.getJwtAudience();
        OAuth2TokenValidator<Jwt> withAudience = jwt -> {
            List<String> audiences = jwt.getAudience();
            if (audiences != null && audiences.contains(audience)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Missing required audience", null)
            );
        };
        OAuth2TokenValidator<Jwt> withUserIdSubject = jwt -> {
            try {
                UUID.fromString(jwt.getSubject());
                return OAuth2TokenValidatorResult.success();
            } catch (IllegalArgumentException | NullPointerException exception) {
                return OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_token", "Invalid user subject", null)
                );
            }
        };
        String issuer = properties.getResolvedSupabaseJwtIssuer();
        OAuth2TokenValidator<Jwt> standardValidators = StringUtils.hasText(issuer)
                ? JwtValidators.createDefaultWithIssuer(issuer)
                : JwtValidators.createDefault();
        return new DelegatingOAuth2TokenValidator<>(
                standardValidators,
                withAudience,
                withUserIdSubject
        );
    }

    private static final class ExpiringJwkSetCache extends ConcurrentMapCache {

        private final ConcurrentMap<Object, Instant> expiresAt = new ConcurrentHashMap<>();
        private final Duration ttl;

        private ExpiringJwkSetCache(int cacheSeconds) {
            super("supabase-jwks");
            this.ttl = Duration.ofSeconds(Math.max(1, cacheSeconds));
        }

        @Override
        protected Object lookup(Object key) {
            Instant expiry = expiresAt.get(key);
            if (expiry != null && !expiry.isAfter(Instant.now())) {
                evict(key);
                return null;
            }
            return super.lookup(key);
        }

        @Override
        public void put(Object key, Object value) {
            super.put(key, value);
            expiresAt.put(key, Instant.now().plus(ttl));
        }

        @Override
        public Cache.ValueWrapper putIfAbsent(Object key, Object value) {
            Cache.ValueWrapper existing = super.putIfAbsent(key, value);
            if (existing == null) {
                expiresAt.put(key, Instant.now().plus(ttl));
            }
            return existing;
        }

        @Override
        public void evict(Object key) {
            super.evict(key);
            expiresAt.remove(key);
        }

        @Override
        public void clear() {
            super.clear();
            expiresAt.clear();
        }
    }

}
