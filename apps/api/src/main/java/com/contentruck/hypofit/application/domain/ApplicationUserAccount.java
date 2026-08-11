package com.contentruck.hypofit.application.domain;

import java.util.UUID;

public record ApplicationUserAccount(
        UUID id,
        String email,
        String role,
        boolean deleted,
        boolean deactivated
) {
}
