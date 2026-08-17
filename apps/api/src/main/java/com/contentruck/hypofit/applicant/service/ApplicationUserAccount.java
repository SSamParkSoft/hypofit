package com.contentruck.hypofit.applicant.service;

import java.util.UUID;

public record ApplicationUserAccount(
        UUID id,
        String email,
        String role,
        boolean deleted,
        boolean deactivated
) {
}
