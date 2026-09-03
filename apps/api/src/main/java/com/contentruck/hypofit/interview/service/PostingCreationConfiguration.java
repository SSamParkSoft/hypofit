package com.contentruck.hypofit.interview.service;

import java.util.List;

/**
 * Canonical type-aware creation data. Legacy columns remain available for
 * released clients, but are derived from this configuration for new writes.
 */
public record PostingCreationConfiguration(
        Integer durationValue,
        String durationUnit,
        String scheduleMode,
        List<String> scheduleFixedSlots,
        List<String> scheduleRecurringWindows,
        String scheduleNote,
        String recruitmentLimitMode,
        String betaTestEnvironment,
        String betaTestWorkflowNote
) {
    public static PostingCreationConfiguration empty() {
        return new PostingCreationConfiguration(
                null, null, null, List.of(), List.of(), null, null, null, null
        );
    }

    public PostingCreationConfiguration {
        scheduleFixedSlots = scheduleFixedSlots == null ? List.of() : List.copyOf(scheduleFixedSlots);
        scheduleRecurringWindows = scheduleRecurringWindows == null
                ? List.of()
                : List.copyOf(scheduleRecurringWindows);
    }
}
