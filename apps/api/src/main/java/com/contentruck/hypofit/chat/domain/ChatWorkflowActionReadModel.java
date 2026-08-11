package com.contentruck.hypofit.chat.domain;

public record ChatWorkflowActionReadModel(
        String action,
        String label,
        String tone
) {
}
