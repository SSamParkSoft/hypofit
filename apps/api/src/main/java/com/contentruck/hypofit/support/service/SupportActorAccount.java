package com.contentruck.hypofit.support.service;

import java.util.UUID;

public record SupportActorAccount(
        UUID id,
        String email,
        boolean deleted,
        boolean deactivated
) {
}
