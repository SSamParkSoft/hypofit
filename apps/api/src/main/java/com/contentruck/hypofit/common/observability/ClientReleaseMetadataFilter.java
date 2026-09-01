package com.contentruck.hypofit.common.observability;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class ClientReleaseMetadataFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        put("client_version", ClientReleaseMetadata.version(request));
        put("client_build", ClientReleaseMetadata.build(request));
        put("client_revision", ClientReleaseMetadata.revision(request));
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("client_version");
            MDC.remove("client_build");
            MDC.remove("client_revision");
        }
    }

    private void put(String key, String value) {
        if (value != null) {
            MDC.put(key, value);
        }
    }
}
