package com.contentruck.hypofit.block.service;

import java.util.UUID;

public record BlockActorAccount(
        UUID id,
        String email,
        boolean deleted,
        boolean deactivated
) {
}
