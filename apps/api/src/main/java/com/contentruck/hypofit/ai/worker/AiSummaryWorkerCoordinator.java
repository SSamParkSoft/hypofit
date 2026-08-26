package com.contentruck.hypofit.ai.worker;

import com.contentruck.hypofit.ai.service.AiSummaryGenerationService;
import com.contentruck.hypofit.common.config.HypofitProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "hypofit", name = "ai-summary-worker-enabled", havingValue = "true")
public class AiSummaryWorkerCoordinator implements SmartLifecycle {

    private static final Logger logger = LoggerFactory.getLogger(AiSummaryWorkerCoordinator.class);

    private final AiSummaryGenerationService generationService;
    private final HypofitProperties properties;
    private volatile boolean running;
    private volatile Thread workerThread;

    public AiSummaryWorkerCoordinator(
            AiSummaryGenerationService generationService,
            HypofitProperties properties
    ) {
        this.generationService = generationService;
        this.properties = properties;
    }

    @Override
    public synchronized void start() {
        if (running) {
            return;
        }
        running = true;
        workerThread = Thread.ofPlatform()
                .name("hypofit-ai-summary-worker")
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
        return generationService.processPending().processed() > 0;
    }

    private void runLoop() {
        while (running && !Thread.currentThread().isInterrupted()) {
            try {
                boolean active = runOnce();
                sleep(active
                        ? properties.getAiSummaryWorkerActiveSleepSeconds()
                        : properties.getAiSummaryWorkerIdleSleepSeconds());
            } catch (RuntimeException exception) {
                logger.error("ai_summary_worker_iteration_failed", exception);
                sleep(properties.getAiSummaryWorkerErrorSleepSeconds());
            }
        }
    }

    private void sleep(double seconds) {
        try {
            Thread.sleep(Math.max(1L, Math.round(seconds * 1_000.0d)));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
