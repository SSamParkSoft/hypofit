package com.contentruck.hypofit.admin.service;


import com.contentruck.hypofit.common.error.AuthRequiredException;
import com.contentruck.hypofit.user.service.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class AdminAccessService {

    private final AdminAccessRepository repository;
    public AdminAccessService(AdminAccessRepository repository) {
        this.repository = repository;
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

        if (!repository.isAdmin(actor.id())) {
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
