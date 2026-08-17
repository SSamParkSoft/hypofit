package com.contentruck.hypofit.common.security;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;

import com.contentruck.hypofit.common.config.HypofitProperties;
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

public class HypofitJwtDecoder implements JwtDecoder {

    private final HypofitProperties properties;
    private final JwtDecoder delegate;

    public HypofitJwtDecoder(HypofitProperties properties) {
        this.properties = properties;
        this.delegate = buildDelegate(properties);
    }

    @Override
    public Jwt decode(String token) throws JwtException {
        if (delegate == null) {
            throw new JwtException("Supabase JWT verification is not configured");
        }

        return delegate.decode(token);
    }

    private JwtDecoder buildDelegate(HypofitProperties properties) {
        String jwksUrl = properties.getResolvedSupabaseJwksUrl();
        if (StringUtils.hasText(jwksUrl)) {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUrl)
                    .jwsAlgorithms(algorithms -> {
                        algorithms.add(SignatureAlgorithm.RS256);
                        algorithms.add(SignatureAlgorithm.ES256);
                    })
                    .build();
            decoder.setJwtValidator(validator(properties.getJwtAudience()));
            return decoder;
        }

        if (StringUtils.hasText(properties.getSupabaseJwtSecret())) {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(
                    new SecretKeySpec(properties.getSupabaseJwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256")
            ).macAlgorithm(MacAlgorithm.HS256).build();
            decoder.setJwtValidator(validator(properties.getJwtAudience()));
            return decoder;
        }

        return null;
    }

    private OAuth2TokenValidator<Jwt> validator(String audience) {
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

}
