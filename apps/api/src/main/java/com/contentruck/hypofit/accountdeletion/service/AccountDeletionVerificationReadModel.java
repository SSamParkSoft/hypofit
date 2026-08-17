package com.contentruck.hypofit.accountdeletion.service;

import java.time.OffsetDateTime;

public record AccountDeletionVerificationReadModel(
        AccountDeletionRequestReadModel request,
        String deletionAuthorization,
        OffsetDateTime deletionAuthorizationExpiresAt
) {
}
