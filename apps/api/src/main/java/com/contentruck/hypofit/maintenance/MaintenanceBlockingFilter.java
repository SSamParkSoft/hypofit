package com.contentruck.hypofit.maintenance;

import com.contentruck.hypofit.common.observability.RequestIdContext;
import com.contentruck.hypofit.maintenance.service.MaintenanceRepository;
import com.contentruck.hypofit.maintenance.service.MaintenanceService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class MaintenanceBlockingFilter extends OncePerRequestFilter {
    private static final long CACHE_MILLIS = 2_000L;
    private final MaintenanceService maintenanceService;
    private volatile CachedActive cached = new CachedActive(0L, null);

    public MaintenanceBlockingFilter(MaintenanceService maintenanceService) { this.maintenanceService = maintenanceService; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (!isBypass(request) && active().isPresent()) {
            String requestId = RequestIdContext.from(request);
            response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
            response.setHeader(HttpHeaders.RETRY_AFTER, "300");
            response.setHeader(RequestIdContext.REQUEST_ID_HEADER, requestId);
            response.getWriter().write("{\"error\":{\"code\":\"maintenance_in_progress\",\"message\":\"서비스 점검 중이에요. 잠시 후 다시 확인해 주세요.\",\"status\":503,\"request_id\":\"" + requestId + "\",\"debug_message\":null,\"field_errors\":null}}");
            return;
        }
        chain.doFilter(request, response);
    }

    private Optional<MaintenanceRepository.MaintenanceRecord> active() {
        CachedActive current = cached;
        long now = Instant.now().toEpochMilli();
        if (current.expiresAt > now) return current.active;
        Optional<MaintenanceRepository.MaintenanceRecord> active = Optional.ofNullable(maintenanceService.active());
        cached = new CachedActive(now + CACHE_MILLIS, active);
        return active;
    }

    private boolean isBypass(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || "/api/v1/service-status".equals(path)
                || path.startsWith("/api/v1/notices")
                || path.startsWith("/api/v1/admin/")
                || "/health".equals(path)
                || path.startsWith("/api/v1/health")
                || path.startsWith("/actuator/");
    }

    private record CachedActive(long expiresAt, Optional<MaintenanceRepository.MaintenanceRecord> active) { }
}
