package com.contentruck.hypofit.socialauth.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class SocialAuthReadModels {

    private SocialAuthReadModels() {
    }

    public record ProviderCapability(
            String provider,
            boolean enabled,
            String state
    ) {
    }

    public record CapabilitiesReadModel(
            String platform,
            List<ProviderCapability> providers
    ) {
    }

    public record AttemptReadModel(
            UUID attemptId,
            String attemptSecret,
            String provider,
            String platform,
            String flow,
            String returnPath,
            OffsetDateTime expiresAt
    ) {
    }

    public record IdentityReadModel(
            String provider,
            String email,
            Boolean emailVerified,
            String status,
            OffsetDateTime linkedAt
    ) {
    }

    public record CompleteReadModel(
            IdentityReadModel identity,
            String nextStep,
            String returnPath
    ) {
    }

    public record IdentityListReadModel(
            List<IdentityReadModel> identities
    ) {
    }

    public record IdentityReconcileReadModel(
            List<IdentityReadModel> identities,
            List<String> revokedProviders,
            OffsetDateTime reconciledAt
    ) {
    }

    public record VerifiedProviderIdentity(
            String provider,
            String subject,
            String supabaseIdentityId,
            String email,
            Boolean emailVerified
    ) {
    }
}
