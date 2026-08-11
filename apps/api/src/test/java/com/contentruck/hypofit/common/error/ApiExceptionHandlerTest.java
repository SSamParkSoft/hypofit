package com.contentruck.hypofit.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.observability.RequestIdContext;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

class ApiExceptionHandlerTest {

    @Test
    void unexpectedFailureKeepsSafeResponseAndStructuredCorrelationLog() {
        HypofitProperties properties = new HypofitProperties();
        properties.setEnv("production");
        ApiExceptionHandler handler = new ApiExceptionHandler(properties);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/example");
        request.setAttribute(RequestIdContext.REQUEST_ID_ATTRIBUTE, "req_test");

        Logger logger = (Logger) LoggerFactory.getLogger(ApiExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            ResponseEntity<Map<String, Object>> response = handler.handleUnexpected(
                    new IllegalStateException("sensitive internal detail"),
                    request
            );

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            assertThat(response.getBody()).containsOnlyKeys("error");
            assertThat(response.getHeaders().getFirst(RequestIdContext.REQUEST_ID_HEADER)).isEqualTo("req_test");

            ILoggingEvent event = appender.list.getFirst();
            assertThat(event.getFormattedMessage()).isEqualTo("Unhandled request failure");
            assertThat(event.getThrowableProxy()).isNotNull();
            assertThat(event.getMDCPropertyMap()).containsEntry("request_id", "req_test");
            assertThat(event.getKeyValuePairs())
                    .extracting(pair -> pair.key + "=" + pair.value)
                    .containsExactly(
                            "event=unexpected_error",
                            "method=POST",
                            "path=/api/v1/example"
                    );
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void unexpectedFailureTemporarilyOverridesMdcRequestIdAndRestoresPreviousValue() {
        HypofitProperties properties = new HypofitProperties();
        properties.setEnv("production");
        ApiExceptionHandler handler = new ApiExceptionHandler(properties);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/example");
        request.setAttribute(RequestIdContext.REQUEST_ID_ATTRIBUTE, "req_from_request");

        Logger logger = (Logger) LoggerFactory.getLogger(ApiExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        MDC.put("request_id", "req_previous");
        try {
            handler.handleUnexpected(new IllegalStateException("boom"), request);

            ILoggingEvent event = appender.list.getFirst();
            assertThat(event.getMDCPropertyMap()).containsEntry("request_id", "req_from_request");
            assertThat(MDC.get("request_id")).isEqualTo("req_previous");
        } finally {
            MDC.remove("request_id");
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
