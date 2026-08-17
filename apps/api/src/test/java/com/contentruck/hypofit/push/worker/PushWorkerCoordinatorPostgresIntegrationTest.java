package com.contentruck.hypofit.push.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.push.service.PushDispatchService;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class PushWorkerCoordinatorPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private DataSource dataSource;

    @Test
    void keepsTheLeaseOnlyForTheCurrentIteration() throws Exception {
        PushDispatchService firstDispatch = mock(PushDispatchService.class);
        PushDispatchService secondDispatch = mock(PushDispatchService.class);
        CountDownLatch firstDispatchStarted = new CountDownLatch(1);
        CountDownLatch allowFirstDispatchToFinish = new CountDownLatch(1);
        AtomicReference<Throwable> firstFailure = new AtomicReference<>();
        when(firstDispatch.dispatchPendingDeliveries(5)).thenAnswer(invocation -> {
            firstDispatchStarted.countDown();
            boolean released = allowFirstDispatchToFinish.await(5, TimeUnit.SECONDS);
            assertThat(released).isTrue();
            return zeroResult();
        });
        when(secondDispatch.dispatchPendingDeliveries(5)).thenReturn(zeroResult());

        HypofitProperties properties = new HypofitProperties();
        properties.getPush().setPushWorkerBatchSize(5);
        PushWorkerCoordinator first = new PushWorkerCoordinator(firstDispatch, dataSource, properties);
        PushWorkerCoordinator second = new PushWorkerCoordinator(secondDispatch, dataSource, properties);

        Thread firstRun = Thread.ofPlatform().start(() -> {
            try {
                assertThat(first.runOnce()).isFalse();
            } catch (Throwable throwable) {
                firstFailure.set(throwable);
            }
        });

        assertThat(firstDispatchStarted.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(second.runOnce()).isFalse();
        verify(firstDispatch).dispatchPendingDeliveries(5);
        verify(secondDispatch, times(0)).dispatchPendingDeliveries(5);

        allowFirstDispatchToFinish.countDown();
        firstRun.join(5_000L);
        assertThat(firstRun.isAlive()).isFalse();
        assertThat(firstFailure.get()).isNull();

        assertThat(second.runOnce()).isFalse();
        verify(secondDispatch).dispatchPendingDeliveries(5);
    }

    private PushDispatchService.PushDispatchResult zeroResult() {
        return new PushDispatchService.PushDispatchResult(0, 0, 0, 0, 0);
    }
}
