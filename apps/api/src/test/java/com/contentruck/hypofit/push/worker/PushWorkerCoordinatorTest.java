package com.contentruck.hypofit.push.worker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.push.service.PushDispatchService;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PushWorkerCoordinatorTest {

    private PushDispatchService dispatchService;
    private DataSource dataSource;
    private Connection connection;
    private PreparedStatement statement;
    private PreparedStatement unlockStatement;
    private ResultSet resultSet;
    private HypofitProperties properties;

    @BeforeEach
    void setUp() throws Exception {
        dispatchService = mock(PushDispatchService.class);
        dataSource = mock(DataSource.class);
        connection = mock(Connection.class);
        statement = mock(PreparedStatement.class);
        unlockStatement = mock(PreparedStatement.class);
        resultSet = mock(ResultSet.class);
        properties = new HypofitProperties();
        properties.getPush().setPushWorkerBatchSize(7);

        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement("select pg_try_advisory_lock(?)")).thenReturn(statement);
        when(connection.prepareStatement("select pg_advisory_unlock(?)")).thenReturn(unlockStatement);
        when(statement.executeQuery()).thenReturn(resultSet);
        when(resultSet.next()).thenReturn(true);
    }

    @Test
    void dispatchesOnlyAfterAcquiringThePostgresLease() throws Exception {
        when(resultSet.getBoolean(1)).thenReturn(true);
        when(dispatchService.dispatchPendingDeliveries(7))
                .thenReturn(new PushDispatchService.PushDispatchResult(2, 2, 0, 0, 0));
        PushWorkerCoordinator coordinator = new PushWorkerCoordinator(dispatchService, dataSource, properties);

        assertThat(coordinator.runOnce()).isTrue();

        verify(statement).setLong(1, 20_357_436_588_372L);
        verify(unlockStatement).setLong(1, 20_357_436_588_372L);
        verify(unlockStatement).execute();
        verify(dispatchService).dispatchPendingDeliveries(7);
        verify(connection).close();
    }

    @Test
    void skipsDispatchWhenAnotherWorkerOwnsTheLease() throws Exception {
        when(resultSet.getBoolean(1)).thenReturn(false);
        PushWorkerCoordinator coordinator = new PushWorkerCoordinator(dispatchService, dataSource, properties);

        assertThat(coordinator.runOnce()).isFalse();

        verify(dispatchService, never()).dispatchPendingDeliveries(7);
        verify(connection).close();
    }

    @Test
    void closesCandidateConnectionWhenLeaseQueryFails() throws Exception {
        when(statement.executeQuery()).thenThrow(new java.sql.SQLException("lease query failed"));
        PushWorkerCoordinator coordinator = new PushWorkerCoordinator(dispatchService, dataSource, properties);

        assertThrows(IllegalStateException.class, coordinator::runOnce);

        verify(unlockStatement, never()).execute();
        verify(connection).close();
        verify(dispatchService, never()).dispatchPendingDeliveries(7);
    }

    @Test
    void closesLeaseConnectionWhenDispatchFails() throws Exception {
        when(resultSet.getBoolean(1)).thenReturn(true);
        when(dispatchService.dispatchPendingDeliveries(7)).thenThrow(new IllegalStateException("dispatch failed"));
        PushWorkerCoordinator coordinator = new PushWorkerCoordinator(dispatchService, dataSource, properties);

        assertThrows(IllegalStateException.class, coordinator::runOnce);

        verify(unlockStatement).execute();
        verify(connection).close();
    }
}
