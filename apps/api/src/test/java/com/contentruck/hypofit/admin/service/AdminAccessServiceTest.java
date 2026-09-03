package com.contentruck.hypofit.admin.service;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class AdminAccessServiceTest {

    @Mock
    private AdminAccessRepository repository;

    @Test
    void requireAdminReturnsCurrentAdminForStoredAdmin() {
        UUID userId = UUID.randomUUID();
        when(repository.findActorAccount(userId)).thenReturn(Optional.of(
                new AdminAccessRepository.AdminActorRecord(
                        userId,
                        "admin@example.com",
                        "운영자",
                        null,
                        null
                )
        ));
        when(repository.isAdmin(userId)).thenReturn(true);

        AdminAccessService service = new AdminAccessService(repository);
        AdminAccessService.CurrentAdmin admin = service.requireAdmin(jwt(userId));

        assertThat(admin.id()).isEqualTo(userId);
        assertThat(admin.email()).isEqualTo("admin@example.com");
        assertThat(admin.name()).isEqualTo("운영자");
    }

    @Test
    void requireAdminRejectsUserOutsideAdminAllowlist() {
        UUID userId = UUID.randomUUID();
        when(repository.findActorAccount(userId)).thenReturn(Optional.of(
                new AdminAccessRepository.AdminActorRecord(
                        userId,
                        "user@example.com",
                        "일반 사용자",
                        null,
                        null
                )
        ));
        when(repository.isAdmin(userId)).thenReturn(false);

        AdminAccessService service = new AdminAccessService(repository);

        assertThatThrownBy(() -> service.requireAdmin(jwt(userId)))
                .isInstanceOf(AdminPermissionDeniedException.class);
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }
}
