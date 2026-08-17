package com.contentruck.hypofit.accountdeletion.service;

import java.util.UUID;

public interface AccountDeletionAuthCleanupGateway {

    AuthCleanupResult deleteAuthUser(UUID userId);

    record AuthCleanupResult(String status, String errorCode) {
    }
}
