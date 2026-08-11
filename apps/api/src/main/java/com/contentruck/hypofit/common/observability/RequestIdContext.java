package com.contentruck.hypofit.common.observability;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

public final class RequestIdContext {

    public static final String REQUEST_ID_HEADER = "X-Request-ID";
    public static final String REQUEST_ID_ATTRIBUTE = RequestIdContext.class.getName() + ".requestId";

    private RequestIdContext() {
    }

    public static String from(HttpServletRequest request) {
        Object value = request.getAttribute(REQUEST_ID_ATTRIBUTE);
        if (value instanceof String requestId && StringUtils.hasText(requestId)) {
            return requestId;
        }
        return "unknown";
    }
}
