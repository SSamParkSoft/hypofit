package com.contentruck.hypofit.chat.service;

public record ChatWorkflowActionReadModel(
        String action,
        String label,
        String tone
) {
}
