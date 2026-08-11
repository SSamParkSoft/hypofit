package com.contentruck.hypofit.socialauth.application;

import com.contentruck.hypofit.socialauth.domain.SocialAuthReadModels;
import java.util.List;
import java.util.UUID;

public interface SocialAuthAdminClient {

    SocialAuthAdminUser getAuthUser(UUID userId);

    record SocialAuthAdminUser(
            List<SocialAuthReadModels.VerifiedProviderIdentity> identities
    ) {
    }
}
