package com.contentruck.hypofit.push.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class PushOutboxMetricsTest {

    @Test
    void exposesOnlyPendingCountAndOldestPendingAge() {
        PushDispatchRepository repository = Mockito.mock(PushDispatchRepository.class);
        when(repository.snapshotPendingDeliveries(Mockito.any()))
                .thenReturn(new PushDispatchRepository.PushOutboxSnapshot(3, 42));
        SimpleMeterRegistry registry = new SimpleMeterRegistry();

        new PushOutboxMetrics(repository, registry);

        assertThat(registry.get("hypofit.push.outbox.pending").gauge().value()).isEqualTo(3);
        assertThat(registry.get("hypofit.push.outbox.oldest_pending_age").gauge().value()).isEqualTo(42);
    }
}
