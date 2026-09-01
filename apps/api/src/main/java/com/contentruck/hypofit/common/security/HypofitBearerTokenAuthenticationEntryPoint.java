package com.contentruck.hypofit.common.security;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.ErrorDetail;
import com.contentruck.hypofit.common.error.ErrorResponse;
import com.contentruck.hypofit.common.observability.RequestIdContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class HypofitBearerTokenAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;
    private final HypofitProperties properties;

    public HypofitBearerTokenAuthenticationEntryPoint(ObjectMapper objectMapper, HypofitProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException, ServletException {
        HypofitAuthFailure failure = classify(authException);
        String requestId = RequestIdContext.from(request);

        ErrorResponse payload = new ErrorResponse(new ErrorDetail(
                failure.code(),
                failure.message(),
                failure.status(),
                requestId,
                properties.isProduction() ? null : failure.debugMessage(),
                null
        ));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", payload.error());
        if (!properties.isProduction() && failure.debugMessage() != null) {
            body.put("detail", failure.debugMessage());
        }

        response.setStatus(failure.status());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader(RequestIdContext.REQUEST_ID_HEADER, requestId);
        objectMapper.writeValue(response.getOutputStream(), body);
    }

    private HypofitAuthFailure classify(AuthenticationException exception) {
        HypofitJwtException verifierUnavailable = find(exception, HypofitJwtException.class);
        if (verifierUnavailable != null) {
            return new HypofitAuthFailure(
                    verifierUnavailable.getCode(),
                    verifierUnavailable.getUserMessage(),
                    verifierUnavailable.getStatus(),
                    verifierUnavailable.getDebugMessage()
            );
        }
        if (exception instanceof InsufficientAuthenticationException) {
            return new HypofitAuthFailure("auth_required", "로그인이 필요해요.", 401, "Missing bearer token");
        }

        JwtValidationException validationException = find(exception, JwtValidationException.class);
        if (validationException != null && validationException.getErrors().stream()
                .map(error -> error.getDescription())
                .filter(java.util.Objects::nonNull)
                .anyMatch(description -> description.toLowerCase(java.util.Locale.ROOT).contains("expired"))) {
            return new HypofitAuthFailure("auth_token_expired", "다시 로그인해 주세요.", 401, "Token expired");
        }

        InvalidBearerTokenException invalidBearerTokenException = find(exception, InvalidBearerTokenException.class);
        if (invalidBearerTokenException != null) {
            return new HypofitAuthFailure("auth_invalid_token", "로그인 정보를 다시 확인해 주세요.", 401, "Invalid token");
        }

        return new HypofitAuthFailure("auth_required", "로그인이 필요해요.", 401, "Missing bearer token");
    }

    private <T extends Throwable> T find(Throwable throwable, Class<T> type) {
        Throwable current = throwable;
        while (current != null) {
            if (type.isInstance(current)) {
                return type.cast(current);
            }
            current = current.getCause();
        }
        return null;
    }

    private record HypofitAuthFailure(String code, String message, int status, String debugMessage) {
    }
}
