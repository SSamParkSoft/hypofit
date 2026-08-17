package com.contentruck.hypofit.socialauth.service;


import java.util.List;
import java.util.UUID;

public interface SocialAuthAdminClient {

    SocialAuthAdminUser getAuthUser(UUID userId);

    record SocialAuthAdminUser(
            List<SocialAuthReadModels.VerifiedProviderIdentity> identities
    ) {
    }
}
