package com.contentruck.hypofit.admin.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.admin.application.AdminAccessService;
import com.contentruck.hypofit.admin.application.AdminOperationsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.contentruck.hypofit.notification.domain.NotificationReadModel;
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
class AdminOperationsControllerTest {

    @Mock
    private AdminAccessService adminAccessService;

    @Mock
    private AdminOperationsService adminOperationsService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void getAdminMeUsesAccessServiceResult() {
        UUID userId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(adminAccessService.requireAdmin(jwt)).thenReturn(new AdminAccessService.CurrentAdmin(
                userId,
                "admin@example.com",
                "운영자"
        ));

        AdminOperationsController controller = new AdminOperationsController(adminAccessService, adminOperationsService);
        AdminOperationsWebModels.AdminMeResponse response = controller.getAdminMe(jwt);

        assertThat(response.id()).isEqualTo(userId);
        assertThat(response.role()).isEqualTo("admin");
    }

    @Test
    void createTestNotificationParsesPayloadBeforeServiceCall() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        NotificationReadModel notification = new NotificationReadModel(
                UUID.randomUUID(),
                userId,
                "support_replied",
                "문의 답변 테스트예요",
                "문의 답변 알림 라우팅을 확인해 주세요.",
                "support_ticket",
                targetId,
                Map.of("source", "admin_test_notification"),
                null,
                OffsetDateTime.of(2026, 7, 31, 13, 0, 0, 0, ZoneOffset.UTC)
        );
        when(adminAccessService.requireAdmin(jwt)).thenReturn(new AdminAccessService.CurrentAdmin(
                userId,
                "admin@example.com",
                "운영자"
        ));
        when(adminOperationsService.createTestNotification(argThat(command ->
                "admin@example.com".equals(command.email())
                        && "support_replied".equals(command.type())
                        && "support_ticket".equals(command.targetType())
                        && targetId.equals(command.targetId())
                        && !command.dispatch()
        ))).thenReturn(new AdminOperationsService.AdminTestNotificationView(notification, null));

        AdminOperationsController controller = new AdminOperationsController(adminAccessService, adminOperationsService);
        AdminOperationsWebModels.AdminTestNotificationResponse response = controller.createTestNotification(
                objectMapper.readValue("""
                        {
                          "email": " ADMIN@EXAMPLE.COM ",
                          "type": "support_replied",
                          "target_type": "support_ticket",
                          "target_id": "%s"
                        }
                        """.formatted(targetId), AdminTestNotificationCreateRequest.class),
                jwt
        );

        assertThat(response.notification().type()).isEqualTo("support_replied");
        assertThat(response.dispatchResult()).isNull();
    }

    @Test
    void dispatchPendingPushDeliveriesRequiresAdminAndReturnsResult() {
        UUID userId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(adminAccessService.requireAdmin(jwt)).thenReturn(new AdminAccessService.CurrentAdmin(
                userId,
                "admin@example.com",
                "운영자"
        ));
        when(adminOperationsService.dispatchPendingPushDeliveries())
                .thenReturn(new AdminOperationsService.PushDispatchResultView(2, 1, 0, 0, 1));

        AdminOperationsController controller = new AdminOperationsController(adminAccessService, adminOperationsService);
        AdminOperationsWebModels.PushDispatchResultResponse response = controller.dispatchPendingPushDeliveries(jwt);

        assertThat(response.processed()).isEqualTo(2);
        assertThat(response.sent()).isEqualTo(1);
        assertThat(response.skipped()).isEqualTo(1);
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }
}
