package com.contentruck.hypofit.support.application;

import java.util.LinkedHashSet;
import java.util.Set;

public record SupportTicketUpdateCommand(
        Set<String> providedFields,
        String category,
        String subject,
        String body,
        String contactEmail
) {
    public SupportTicketUpdateCommand {
        providedFields = providedFields == null ? Set.of() : Set.copyOf(new LinkedHashSet<>(providedFields));
    }
}
