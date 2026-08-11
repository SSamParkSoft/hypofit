package com.contentruck.hypofit.push.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.push.application.PushDispatchService;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class PushWorkerCoordinatorPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private DataSource dataSource;

    @Test
    void transfersExclusiveWorkerLeaseOnlyAfterTheCurrentOwnerStops() {
        PushDispatchService firstDispatch = mock(PushDispatchService.class);
        PushDispatchService secondDispatch = mock(PushDispatchService.class);
        when(firstDispatch.dispatchPendingDeliveries(5)).thenReturn(zeroResult());
        when(secondDispatch.dispatchPendingDeliveries(5)).thenReturn(zeroResult());

        HypofitProperties properties = new HypofitProperties();
        properties.getPush().setPushWorkerBatchSize(5);
        PushWorkerCoordinator first = new PushWorkerCoordinator(firstDispatch, dataSource, properties);
        PushWorkerCoordinator second = new PushWorkerCoordinator(secondDispatch, dataSource, properties);

        assertThat(first.runOnce()).isFalse();
        assertThat(second.runOnce()).isFalse();
        verify(firstDispatch).dispatchPendingDeliveries(5);
        verify(secondDispatch, times(0)).dispatchPendingDeliveries(5);

        first.stop();

        assertThat(second.runOnce()).isFalse();
        verify(secondDispatch).dispatchPendingDeliveries(5);
        second.stop();
    }

    private PushDispatchService.PushDispatchResult zeroResult() {
        return new PushDispatchService.PushDispatchResult(0, 0, 0, 0, 0);
    }
}
