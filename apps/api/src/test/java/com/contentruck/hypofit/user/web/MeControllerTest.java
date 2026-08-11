package com.contentruck.hypofit.user.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.user.application.UserQueryService;
import com.contentruck.hypofit.user.domain.UserProfile;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class MeControllerTest {

    @Mock
    private UserQueryService userQueryService;

    @Test
    void getMeUsesJwtSubjectAsUserId() {
        UUID userId = UUID.randomUUID();
        when(userQueryService.getMe(userId)).thenReturn(profile(userId));

        MeController controller = new MeController(userQueryService);
        UserMeResponse response = controller.getMe(jwt(userId));

        assertThat(response.id()).isEqualTo(userId);
        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.name()).isEqualTo("세현");
        assertThat(response.role()).isEqualTo("both");
    }

    @Test
    void syncMeUsesJwtSubjectAndEmail() {
        UUID userId = UUID.randomUUID();
        UserWebModels.UserSyncRequest request = new UserWebModels.UserSyncRequest();
        request.setName("세현");
        request.setPhone("01012345678");
        when(userQueryService.syncMe(any(), any(), any())).thenReturn(profile(userId));

        MeController controller = new MeController(userQueryService);
        UserMeResponse response = controller.syncMe(request, jwt(userId));

        assertThat(response.id()).isEqualTo(userId);
        verify(userQueryService).syncMe(userId, "user@example.com", request.toCommand());
    }

    @Test
    void updateMeUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        UserWebModels.UserUpdateRequest request = new UserWebModels.UserUpdateRequest();
        request.setName("세현");
        request.setRole("both");
        when(userQueryService.updateMe(any(), any())).thenReturn(profile(userId));

        MeController controller = new MeController(userQueryService);
        UserMeResponse response = controller.updateMe(request, jwt(userId));

        assertThat(response.id()).isEqualTo(userId);
        verify(userQueryService).updateMe(userId, request.toCommand());
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .claim("email", "user@example.com")
                .build();
    }

    private UserProfile profile(UUID userId) {
        return new UserProfile(
                userId,
                "user@example.com",
                "세현",
                null,
                "010-1234-5678",
                "both",
                null,
                "https://cdn.example.com/profile.png"
        );
    }
}
