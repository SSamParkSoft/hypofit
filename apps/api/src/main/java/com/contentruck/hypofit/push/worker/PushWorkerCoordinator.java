package com.contentruck.hypofit.push.worker;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.push.service.PushDispatchService;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.SmartLifecycle;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("push-worker")
@ConditionalOnProperty(prefix = "hypofit.push", name = "push-worker-enabled", havingValue = "true")
public class PushWorkerCoordinator implements SmartLifecycle {

    private static final Logger logger = LoggerFactory.getLogger(PushWorkerCoordinator.class);
    private static final long WORKER_LOCK_ID = 20_357_436_588_372L;

    private final PushDispatchService dispatchService;
    private final DataSource dataSource;
    private final HypofitProperties properties;

    private volatile boolean running;
    private volatile Thread workerThread;

    public PushWorkerCoordinator(
            PushDispatchService dispatchService,
            DataSource dataSource,
            HypofitProperties properties
    ) {
        this.dispatchService = dispatchService;
        this.dataSource = dataSource;
        this.properties = properties;
    }

    @Override
    public synchronized void start() {
        if (running) {
            return;
        }
        running = true;
        workerThread = Thread.ofPlatform()
                .name("hypofit-push-worker")
                .daemon(false)
                .start(this::runLoop);
    }

    @Override
    public synchronized void stop() {
        running = false;
        Thread thread = workerThread;
        if (thread != null) {
            thread.interrupt();
            try {
                thread.join(5_000L);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        }
        workerThread = null;
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE;
    }

    boolean runOnce() {
        try (Connection connection = dataSource.getConnection()) {
            if (!tryAcquireLease(connection)) {
                return false;
            }
            try {
                PushDispatchService.PushDispatchResult result = dispatchService.dispatchPendingDeliveries(
                        properties.getPush().getPushWorkerBatchSize()
                );
                return result.processed() > 0;
            } finally {
                releaseLease(connection);
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not acquire the push worker lease", exception);
        }
    }

    private void runLoop() {
        while (running && !Thread.currentThread().isInterrupted()) {
            try {
                boolean active = runOnce();
                sleepSeconds(active
                        ? properties.getPush().getPushWorkerActiveSleepSeconds()
                        : properties.getPush().getPushWorkerIdleSleepSeconds());
            } catch (RuntimeException exception) {
                logger.error("push_worker_iteration_failed", exception);
                sleepSeconds(properties.getPush().getPushWorkerErrorSleepSeconds());
            }
        }
    }

    private boolean tryAcquireLease(Connection connection) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("select pg_try_advisory_lock(?)")) {
            statement.setLong(1, WORKER_LOCK_ID);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() && resultSet.getBoolean(1);
            }
        }
    }

    private void releaseLease(Connection connection) {
        try (PreparedStatement statement = connection.prepareStatement("select pg_advisory_unlock(?)")) {
            statement.setLong(1, WORKER_LOCK_ID);
            statement.execute();
        } catch (SQLException exception) {
            logger.warn("push_worker_lease_release_failed", exception);
        }
    }

    private void sleepSeconds(double seconds) {
        long millis = Math.max(1L, Math.round(seconds * 1_000.0d));
        try {
            Thread.sleep(millis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
