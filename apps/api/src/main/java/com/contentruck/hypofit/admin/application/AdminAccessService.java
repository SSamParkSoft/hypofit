package com.contentruck.hypofit.admin.application;

import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.AuthRequiredException;
import com.contentruck.hypofit.user.application.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.application.UserAccountDeletedException;
import com.contentruck.hypofit.user.application.UserProfileMissingException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class AdminAccessService {

    private final AdminAccessRepository repository;
    private final Set<String> adminEmails;

    public AdminAccessService(AdminAccessRepository repository, HypofitProperties properties) {
        this.repository = repository;
        this.adminEmails = properties.getAdminEmails().stream()
                .filter(email -> email != null && !email.isBlank())
                .map(email -> email.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    public CurrentAdmin requireAdmin(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new AuthRequiredException("JWT subject is missing");
        }

        UUID userId;
        try {
            userId = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new AuthRequiredException("JWT subject is invalid");
        }

        AdminAccessRepository.AdminActorRecord actor = repository.findActorAccount(userId)
                .orElseThrow(UserProfileMissingException::new);

        if (actor.deletedAt() != null) {
            throw new UserAccountDeletedException();
        }
        if (actor.deactivatedAt() != null) {
            throw new UserAccountDeactivatedException();
        }

        String email = actor.email() == null ? "" : actor.email().trim().toLowerCase(Locale.ROOT);
        if (!adminEmails.contains(email)) {
            throw new AdminPermissionDeniedException();
        }

        return new CurrentAdmin(actor.id(), actor.email(), actor.name());
    }

    public record CurrentAdmin(
            UUID id,
            String email,
            String name
    ) {
    }
}
