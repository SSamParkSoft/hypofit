package com.contentruck.hypofit.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.observability.RequestIdContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class HypofitBearerTokenAuthenticationEntryPointTest {

    @Test
    void returnsServiceUnavailableForJwksTransportFailure() throws Exception {
        HypofitProperties properties = new HypofitProperties();
        HypofitBearerTokenAuthenticationEntryPoint entryPoint = new HypofitBearerTokenAuthenticationEntryPoint(
                new ObjectMapper(),
                properties
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(RequestIdContext.REQUEST_ID_ATTRIBUTE, "req_auth_jwks");
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(
                request,
                response,
                new InvalidBearerTokenException(
                        "JWKS unavailable",
                        new HypofitJwtException(
                                "auth_verifier_unavailable",
                                "로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
                                503,
                                "Supabase JWKS verification transport failure",
                                new IllegalStateException("timeout")
                        )
                )
        );

        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getHeader(RequestIdContext.REQUEST_ID_HEADER)).isEqualTo("req_auth_jwks");
        assertThat(response.getContentAsString())
                .contains("auth_verifier_unavailable")
                .contains("잠시 후 다시 시도해 주세요.");
    }
}
