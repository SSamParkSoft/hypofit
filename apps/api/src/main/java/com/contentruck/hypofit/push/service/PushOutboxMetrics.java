package com.contentruck.hypofit.push.service;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;

@Component
public class PushOutboxMetrics {

    public PushOutboxMetrics(PushDispatchRepository repository, MeterRegistry meterRegistry) {
        Gauge.builder("hypofit.push.outbox.pending", repository, PushOutboxMetrics::pendingCount)
                .description("Push deliveries ready for dispatch")
                .register(meterRegistry);
        Gauge.builder("hypofit.push.outbox.oldest_pending_age", repository, PushOutboxMetrics::oldestPendingAgeSeconds)
                .description("Age in seconds of the oldest push delivery ready for dispatch")
                .register(meterRegistry);
    }

    private static double pendingCount(PushDispatchRepository repository) {
        return snapshot(repository).pendingCount();
    }

    private static double oldestPendingAgeSeconds(PushDispatchRepository repository) {
        return snapshot(repository).oldestPendingAgeSeconds();
    }

    private static PushDispatchRepository.PushOutboxSnapshot snapshot(PushDispatchRepository repository) {
        return repository.snapshotPendingDeliveries(OffsetDateTime.now());
    }
}
