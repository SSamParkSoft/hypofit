package com.contentruck.hypofit.common.web;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final ReadinessService readinessService;

    public HealthController(ReadinessService readinessService) {
        this.readinessService = readinessService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
                "status", "ok",
                "service", "hypofit-api"
        );
    }

    @GetMapping("/api/v1/health")
    public Map<String, String> apiHealth() {
        return Map.of(
                "status", "ok",
                "service", "hypofit-api",
                "scope", "api-v1"
        );
    }

    @GetMapping("/api/v1/health/ready")
    public ResponseEntity<Map<String, Object>> readiness() {
        Map<String, Object> readiness = readinessService.readiness();
        HttpStatus status = "ok".equals(readiness.get("status"))
                ? HttpStatus.OK
                : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(readiness);
    }
}
