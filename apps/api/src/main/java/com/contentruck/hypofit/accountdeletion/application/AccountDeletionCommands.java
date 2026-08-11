package com.contentruck.hypofit.accountdeletion.application;

import java.util.UUID;

public final class AccountDeletionCommands {

    private AccountDeletionCommands() {
    }

    public record PublicCreateCommand(
            String email,
            String requesterName,
            String reason
    ) {
    }

    public record AuthenticatedCreateCommand(String reason) {
    }

    public record VerifyCommand(
            UUID requestId,
            String code,
            String token
    ) {
    }

    public record ResendCommand(UUID requestId) {
    }

    public record ConfirmCommand(
            UUID requestId,
            String deletionAuthorization,
            boolean confirm
    ) {
    }
}
