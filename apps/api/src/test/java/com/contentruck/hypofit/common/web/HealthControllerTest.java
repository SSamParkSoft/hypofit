package com.contentruck.hypofit.common.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class HealthControllerTest {

    @Mock
    private ReadinessService readinessService;

    @InjectMocks
    private HealthController healthController;

    @Test
    void readinessReturnsOkWhenAllRequiredChecksPass() {
        when(readinessService.readiness()).thenReturn(Map.of("status", "ok"));

        ResponseEntity<Map<String, Object>> response = healthController.readiness();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("status", "ok");
    }

    @Test
    void readinessReturnsServiceUnavailableWhenRequiredChecksFail() {
        when(readinessService.readiness()).thenReturn(Map.of("status", "degraded"));

        ResponseEntity<Map<String, Object>> response = healthController.readiness();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).containsEntry("status", "degraded");
    }
}
