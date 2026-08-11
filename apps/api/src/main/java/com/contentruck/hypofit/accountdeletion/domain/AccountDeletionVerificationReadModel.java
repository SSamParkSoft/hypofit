package com.contentruck.hypofit.accountdeletion.domain;

import java.time.OffsetDateTime;

public record AccountDeletionVerificationReadModel(
        AccountDeletionRequestReadModel request,
        String deletionAuthorization,
        OffsetDateTime deletionAuthorizationExpiresAt
) {
}
