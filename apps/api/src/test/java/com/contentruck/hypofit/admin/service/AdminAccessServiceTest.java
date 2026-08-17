package com.contentruck.hypofit.admin.service;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.util.List;
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
    void requireAdminReturnsCurrentAdminForConfiguredEmail() {
        UUID userId = UUID.randomUUID();
        HypofitProperties properties = new HypofitProperties();
        properties.setAdminEmails(List.of("ADMIN@example.com"));
        when(repository.findActorAccount(userId)).thenReturn(Optional.of(
                new AdminAccessRepository.AdminActorRecord(
                        userId,
                        "admin@example.com",
                        "운영자",
                        null,
                        null
                )
        ));

        AdminAccessService service = new AdminAccessService(repository, properties);
        AdminAccessService.CurrentAdmin admin = service.requireAdmin(jwt(userId));

        assertThat(admin.id()).isEqualTo(userId);
        assertThat(admin.email()).isEqualTo("admin@example.com");
        assertThat(admin.name()).isEqualTo("운영자");
    }

    @Test
    void requireAdminRejectsNonAdminEmail() {
        UUID userId = UUID.randomUUID();
        HypofitProperties properties = new HypofitProperties();
        properties.setAdminEmails(List.of("operator@example.com"));
        when(repository.findActorAccount(userId)).thenReturn(Optional.of(
                new AdminAccessRepository.AdminActorRecord(
                        userId,
                        "user@example.com",
                        "일반 사용자",
                        null,
                        null
                )
        ));

        AdminAccessService service = new AdminAccessService(repository, properties);

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
