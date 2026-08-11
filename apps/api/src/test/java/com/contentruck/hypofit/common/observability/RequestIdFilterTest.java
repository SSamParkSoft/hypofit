package com.contentruck.hypofit.common.observability;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RequestIdFilterTest {

    @Test
    void keepsProvidedRequestIdWhenValid() {
        assertThat(RequestIdFilter.normalizeRequestId("test-request-id")).isEqualTo("test-request-id");
    }

    @Test
    void generatesRequestIdWhenMissing() {
        String requestId = RequestIdFilter.normalizeRequestId(null);

        assertThat(requestId).startsWith("req_");
        assertThat(requestId).hasSize(36);
    }

    @Test
    void generatesRequestIdWhenTooLong() {
        String requestId = RequestIdFilter.normalizeRequestId("x".repeat(129));

        assertThat(requestId).startsWith("req_");
        assertThat(requestId).hasSize(36);
    }
}
