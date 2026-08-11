package com.contentruck.hypofit.interview.domain;

import java.util.UUID;

public record InterviewPostActorAccount(
        UUID id,
        String email,
        String role,
        boolean deleted,
        boolean deactivated
) {
}
