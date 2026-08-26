package com.contentruck.hypofit.interview.service;

/**
 * Canonical participant compensation value. The legacy reward_amount remains
 * available for released clients during the recruitment-post migration.
 */
public record PostingCompensation(
        String type,
        String label,
        Integer amount,
        String currency,
        Integer points,
        String description,
        String deliveryMethod
) {
}
