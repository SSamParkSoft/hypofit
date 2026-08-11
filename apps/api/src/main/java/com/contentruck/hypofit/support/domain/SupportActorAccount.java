package com.contentruck.hypofit.support.domain;

import java.util.UUID;

public record SupportActorAccount(
        UUID id,
        String email,
        boolean deleted,
        boolean deactivated
) {
}
