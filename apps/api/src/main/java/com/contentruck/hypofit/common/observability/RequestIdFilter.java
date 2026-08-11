package com.contentruck.hypofit.common.observability;

import java.io.IOException;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = normalizeRequestId(request.getHeader(RequestIdContext.REQUEST_ID_HEADER));
        request.setAttribute(RequestIdContext.REQUEST_ID_ATTRIBUTE, requestId);
        response.setHeader(RequestIdContext.REQUEST_ID_HEADER, requestId);

        MDC.put("request_id", requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("request_id");
        }
    }

    static String normalizeRequestId(String value) {
        if (!StringUtils.hasText(value)) {
            return generated();
        }

        String normalized = value.trim();
        if (!StringUtils.hasText(normalized) || normalized.length() > 128) {
            return generated();
        }
        return normalized;
    }

    private static String generated() {
        return "req_" + UUID.randomUUID().toString().replace("-", "");
    }
}
