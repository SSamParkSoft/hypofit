package com.contentruck.hypofit.applicant.service;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class ApplicationWorkflowMetrics {

    private final MeterRegistry meterRegistry;

    public ApplicationWorkflowMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void recordSelection(String outcome) {
        meterRegistry.counter("hypofit.application.selection", "outcome", outcome).increment();
    }
}
