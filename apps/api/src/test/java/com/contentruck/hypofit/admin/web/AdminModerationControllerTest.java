package com.contentruck.hypofit.admin.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.admin.application.AdminAccessService;
import com.contentruck.hypofit.admin.application.AdminModerationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class AdminModerationControllerTest {

    @Mock
    private AdminAccessService adminAccessService;

    @Mock
    private AdminModerationService adminModerationService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void createModerationActionParsesPayloadBeforeServiceCall() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        UUID actionId = UUID.randomUUID();
        UUID sourceTicketId = UUID.randomUUID();
        Jwt jwt = jwt(adminId);

        when(adminAccessService.requireAdmin(jwt)).thenReturn(new AdminAccessService.CurrentAdmin(
                adminId,
                "admin@example.com",
                "운영자"
        ));
        when(adminModerationService.createAction(eq(adminId), argThat(command ->
                "chat_message".equals(command.targetType())
                        && targetId.equals(command.targetId())
                        && "hide".equals(command.action())
                        && "개인정보 요구".equals(command.reason())
                        && sourceTicketId.equals(command.sourceTicketId())
                        && "medium".equals(command.metadata().get("severity"))
        ))).thenReturn(new AdminModerationService.ModerationActionView(
                actionId,
                adminId,
                "chat_message",
                targetId,
                "hide",
                "개인정보 요구",
                sourceTicketId,
                Map.of("severity", "medium"),
                OffsetDateTime.of(2026, 7, 31, 12, 0, 0, 0, ZoneOffset.UTC)
        ));

        AdminModerationController controller = new AdminModerationController(adminAccessService, adminModerationService);
        AdminModerationWebModels.ModerationActionResponse response = controller.createModerationAction(
                jwt,
                objectMapper.readValue("""
                        {
                          "target_type": "chat_message",
                          "target_id": "%s",
                          "action": "hide",
                          "reason": "  개인정보   요구  ",
                          "source_ticket_id": "%s",
                          "metadata": {
                            "severity": "medium"
                          }
                        }
                        """.formatted(targetId, sourceTicketId), AdminModerationActionCreateRequest.class)
        );

        assertThat(response.id()).isEqualTo(actionId);
        assertThat(response.targetId()).isEqualTo(targetId);
        assertThat(response.metadata()).containsEntry("severity", "medium");
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }
}
