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
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.cache.Cache;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
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
import org.springframework.web.client.RestTemplate;

public class HypofitJwtDecoder implements JwtDecoder {

    private final HypofitProperties properties;
    private final JwtDecoder delegate;
    private final MeterRegistry meterRegistry;

    public HypofitJwtDecoder(HypofitProperties properties) {
        this(properties, buildDelegate(properties), new SimpleMeterRegistry());
    }

    public HypofitJwtDecoder(HypofitProperties properties, MeterRegistry meterRegistry) {
        this(properties, buildDelegate(properties), meterRegistry);
    }

    HypofitJwtDecoder(HypofitProperties properties, JwtDecoder delegate) {
        this(properties, delegate, new SimpleMeterRegistry());
    }

    HypofitJwtDecoder(HypofitProperties properties, JwtDecoder delegate, MeterRegistry meterRegistry) {
        this.properties = properties;
        this.delegate = delegate;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Jwt decode(String token) throws JwtException {
        if (delegate == null) {
            recordDecode("not_configured", Timer.start(meterRegistry));
            throw new JwtException("Supabase JWT verification is not configured");
        }

        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            Jwt decoded = delegate.decode(token);
            recordDecode("success", sample);
            return decoded;
        } catch (JwtException exception) {
            if (!hasJwksConfiguration() || !hasTransportFailure(exception)) {
                recordDecode("invalid", sample);
                throw exception;
            }
            meterRegistry.counter("hypofit.auth.jwks.retry").increment();
            try {
                Jwt decoded = delegate.decode(token);
                recordDecode("success_after_retry", sample);
                return decoded;
            } catch (JwtException retryException) {
                if (hasTransportFailure(retryException)) {
                    recordDecode("verifier_unavailable", sample);
                    throw new HypofitJwtException(
                            "auth_verifier_unavailable",
                            "로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
                            503,
                            "Supabase JWKS verification transport failure",
                            retryException
                    );
                }
                recordDecode("invalid_after_retry", sample);
                throw retryException;
            }
        }
    }

    private void recordDecode(String outcome, Timer.Sample sample) {
        sample.stop(meterRegistry.timer("hypofit.auth.jwt.decode", "outcome", outcome));
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
                    .restOperations(jwksRestOperations(properties))
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

    private static RestTemplate jwksRestOperations(HypofitProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(1, properties.getSupabaseJwksConnectTimeoutMillis()));
        requestFactory.setReadTimeout(Math.max(1, properties.getSupabaseJwksReadTimeoutMillis()));
        return new RestTemplate(requestFactory);
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
