package com.contentruck.hypofit.chat.service;

import java.util.UUID;

public record ChatUserSummary(
        UUID id,
        String name,
        String bio,
        String role,
        String profileImageUrl
) {
}
