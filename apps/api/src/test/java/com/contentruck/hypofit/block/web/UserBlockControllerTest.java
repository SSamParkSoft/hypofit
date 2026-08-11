package com.contentruck.hypofit.block.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.block.application.UserBlockService;
import com.contentruck.hypofit.block.domain.UserBlockReadModel;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class UserBlockControllerTest {

    @Mock
    private UserBlockService userBlockService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void listBlockedUsersUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(userBlockService.listBlockedUsers(userId)).thenReturn(List.of(block(userId, UUID.randomUUID(), null)));

        UserBlockController controller = new UserBlockController(userBlockService);
        List<UserBlockResponse> response = controller.listMyBlockedUsers(jwt);

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().blockerId()).isEqualTo(userId);
    }

    @Test
    void blockUserNormalizesReasonBeforeServiceCall() throws Exception {
        UUID blockerId = UUID.randomUUID();
        UUID blockedUserId = UUID.randomUUID();
        Jwt jwt = jwt(blockerId);
        when(userBlockService.blockUser(eq(blockerId), eq(blockedUserId), argThat(command ->
                "불편한 메시지를 보냈습니다.".equals(command.reason())
        ))).thenReturn(block(blockerId, blockedUserId, "불편한 메시지를 보냈습니다."));

        UserBlockController controller = new UserBlockController(userBlockService);
        UserBlockResponse response = controller.blockUser(
                blockedUserId,
                jwt,
                objectMapper.readValue("""
                        {
                          "reason": "  불편한   메시지를   보냈습니다.  "
                        }
                        """, UserBlockCreateRequest.class)
        );

        assertThat(response.reason()).isEqualTo("불편한 메시지를 보냈습니다.");
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .claim("email", "user@example.com")
                .build();
    }

    private UserBlockReadModel block(UUID blockerId, UUID blockedUserId, String reason) {
        return new UserBlockReadModel(
                UUID.randomUUID(),
                blockerId,
                blockedUserId,
                reason,
                "user",
                OffsetDateTime.of(2026, 7, 31, 12, 0, 0, 0, ZoneOffset.UTC),
                null,
                null
        );
    }
}
