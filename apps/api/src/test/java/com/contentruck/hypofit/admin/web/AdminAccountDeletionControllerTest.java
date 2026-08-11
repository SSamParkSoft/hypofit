package com.contentruck.hypofit.admin.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.accountdeletion.application.AccountDeletionService;
import com.contentruck.hypofit.admin.application.AdminAccessService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class AdminAccountDeletionControllerTest {

    @Mock
    private AdminAccessService adminAccessService;

    @Mock
    private AccountDeletionService accountDeletionService;

    @Test
    void listRequestsParsesFiltersBeforeServiceCall() {
        UUID adminId = UUID.randomUUID();
        Jwt jwt = jwt(adminId);
        when(adminAccessService.requireAdmin(jwt)).thenReturn(new AdminAccessService.CurrentAdmin(
                adminId,
                "admin@example.com",
                "운영자"
        ));
        when(accountDeletionService.listAdminRequests("completed", 25)).thenReturn(List.of(view(UUID.randomUUID())));

        AdminAccountDeletionController controller =
                new AdminAccountDeletionController(adminAccessService, accountDeletionService);
        var response = controller.listRequests(jwt, "25", "completed");

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().emailDisplay()).startsWith("삭제 후 비공개");
        verify(accountDeletionService).listAdminRequests("completed", 25);
    }

    @Test
    void retryAuthCleanupUsesAuthenticatedAdmin() {
        UUID adminId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        Jwt jwt = jwt(adminId);
        when(adminAccessService.requireAdmin(jwt)).thenReturn(new AdminAccessService.CurrentAdmin(
                adminId,
                "admin@example.com",
                "운영자"
        ));
        when(accountDeletionService.retryAuthCleanup(requestId, adminId)).thenReturn(view(requestId));

        AdminAccountDeletionController controller =
                new AdminAccountDeletionController(adminAccessService, accountDeletionService);
        var response = controller.retryAuthCleanup(jwt, requestId.toString());

        assertThat(response.id()).isEqualTo(requestId);
        assertThat(response.authCleanupRetryAvailable()).isTrue();
        verify(accountDeletionService).retryAuthCleanup(requestId, adminId);
    }

    private AccountDeletionService.AdminAccountDeletionRequestView view(UUID requestId) {
        OffsetDateTime now = OffsetDateTime.of(2026, 7, 31, 15, 0, 0, 0, ZoneOffset.UTC);
        return new AccountDeletionService.AdminAccountDeletionRequestView(
                requestId,
                UUID.randomUUID(),
                null,
                "삭제 후 비공개 · hash 2f5a9248b1d3",
                "2f5a9248b1d3",
                now,
                "탈퇴",
                "completed",
                "public_web",
                "verified",
                "account_deleted",
                "account_deleted_and_direct_identifiers_anonymized",
                "delete_failed",
                "failed_retryable",
                null,
                "network_error",
                true,
                "retained",
                now.plusDays(365),
                now,
                null,
                now,
                now.minusDays(1),
                now
        );
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }
}
