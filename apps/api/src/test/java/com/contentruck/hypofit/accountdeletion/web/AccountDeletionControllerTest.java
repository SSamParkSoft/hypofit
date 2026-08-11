package com.contentruck.hypofit.accountdeletion.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.AuthenticatedCreateCommand;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.PublicCreateCommand;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionService;
import com.contentruck.hypofit.accountdeletion.domain.AccountDeletionRequestReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class AccountDeletionControllerTest {

    @Mock
    private AccountDeletionService service;

    @Test
    void createPublicRequestReturnsPublicShape() {
        AccountDeletionController controller = new AccountDeletionController(service);
        AccountDeletionRequestReadModel model = request(UUID.randomUUID(), null, "user@example.com", "requested", "public_web");
        when(service.createPublicRequest(new PublicCreateCommand("user@example.com", "세현", "삭제")))
                .thenReturn(model);

        var response = controller.createPublicRequest(new AccountDeletionWebModels.PublicCreateRequest(
                "user@example.com",
                "세현",
                "삭제"
        ));

        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.status()).isEqualTo("requested");
    }

    @Test
    void createAuthenticatedRequestUsesJwtSubject() {
        AccountDeletionController controller = new AccountDeletionController(service);
        UUID userId = UUID.randomUUID();
        when(service.createAuthenticatedRequest(userId, new AuthenticatedCreateCommand("삭제")))
                .thenReturn(request(UUID.randomUUID(), userId, "user@example.com", "requested", "mobile_app"));

        var response = controller.createAuthenticatedRequest(
                jwt(userId),
                new AccountDeletionWebModels.AuthenticatedCreateRequest("삭제")
        );

        assertThat(response.userId()).isEqualTo(userId);
        verify(service).createAuthenticatedRequest(userId, new AuthenticatedCreateCommand("삭제"));
    }

    @Test
    void deleteAuthenticatedAccountUsesJwtSubject() {
        AccountDeletionController controller = new AccountDeletionController(service);
        UUID userId = UUID.randomUUID();
        when(service.deactivateCurrentUser(userId, new AuthenticatedCreateCommand("즉시 삭제")))
                .thenReturn(request(UUID.randomUUID(), userId, "deleted-request@example.com", "completed", "mobile_app"));

        var response = controller.deleteAuthenticatedAccount(
                jwt(userId),
                new AccountDeletionWebModels.AuthenticatedCreateRequest("즉시 삭제")
        );

        assertThat(response.userId()).isEqualTo(userId);
        assertThat(response.status()).isEqualTo("completed");
        verify(service).deactivateCurrentUser(userId, new AuthenticatedCreateCommand("즉시 삭제"));
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }

    private AccountDeletionRequestReadModel request(UUID requestId, UUID userId, String email, String status, String source) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return new AccountDeletionRequestReadModel(
                requestId,
                userId,
                email,
                "hash",
                null,
                "사용자",
                "삭제",
                status,
                source,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                now.plusMinutes(10),
                now.plusSeconds(90),
                null,
                now,
                now
        );
    }
}
