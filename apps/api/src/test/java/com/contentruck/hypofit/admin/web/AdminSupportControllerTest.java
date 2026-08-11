package com.contentruck.hypofit.admin.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.admin.application.AdminAccessService;
import com.contentruck.hypofit.admin.application.AdminSupportRepository;
import com.contentruck.hypofit.admin.application.AdminSupportService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class AdminSupportControllerTest {

    @Mock
    private AdminAccessService adminAccessService;

    @Mock
    private AdminSupportService adminSupportService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void listSupportTicketsParsesFiltersBeforeServiceCall() {
        UUID userId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(adminAccessService.requireAdmin(jwt)).thenReturn(new AdminAccessService.CurrentAdmin(
                userId,
                "admin@example.com",
                "운영자"
        ));
        when(adminSupportService.listTickets("report", "in_review", true, 25))
                .thenReturn(List.of(view()));

        AdminSupportController controller = new AdminSupportController(adminAccessService, adminSupportService);
        List<AdminSupportWebModels.AdminSupportTicketResponse> response = controller.listSupportTickets(
                jwt,
                "true",
                "report",
                "25",
                "in_review"
        );

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().status()).isEqualTo("open");
        assertThat(response.getFirst().replies()).isEmpty();
    }

    @Test
    void addReplyParsesPayloadBeforeServiceCall() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(adminAccessService.requireAdmin(jwt)).thenReturn(new AdminAccessService.CurrentAdmin(
                userId,
                "admin@example.com",
                "운영자"
        ));
        when(adminSupportService.addReply(eq(userId), eq(ticketId), argThat(command ->
                "운영팀에서 확인 중이에요.".equals(command.body())
                        && !command.visibleToUser()
        ))).thenReturn(event(ticketId, userId));

        AdminSupportController controller = new AdminSupportController(adminAccessService, adminSupportService);
        AdminSupportWebModels.SupportTicketEventResponse response = controller.addReply(
                ticketId,
                jwt,
                objectMapper.readValue("""
                        {
                          "body": "  운영팀에서 확인 중이에요.  ",
                          "visible_to_user": false
                        }
                        """, AdminSupportTicketReplyCreateRequest.class)
        );

        assertThat(response.ticketId()).isEqualTo(ticketId);
        assertThat(response.eventType()).isEqualTo("operator_replied");
    }

    private AdminSupportService.AdminSupportTicketView view() {
        AdminSupportRepository.SupportTicketRecord ticket = new AdminSupportRepository.SupportTicketRecord(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "report",
                "abuse",
                "신고 문의",
                "신고 내용을 적었습니다.",
                "user@example.com",
                "chat_message",
                UUID.randomUUID(),
                "open",
                null,
                Map.of(),
                OffsetDateTime.of(2026, 7, 31, 14, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 7, 31, 14, 5, 0, 0, ZoneOffset.UTC)
        );
        return new AdminSupportService.AdminSupportTicketView(ticket, List.of(event(ticket.id(), UUID.randomUUID())));
    }

    private AdminSupportRepository.SupportTicketEventRecord event(UUID ticketId, UUID actorUserId) {
        return new AdminSupportRepository.SupportTicketEventRecord(
                UUID.randomUUID(),
                ticketId,
                actorUserId,
                "operator",
                "operator_replied",
                null,
                "open",
                "운영팀에서 확인 중이에요.",
                Map.of("visible_to_user", false),
                OffsetDateTime.of(2026, 7, 31, 14, 10, 0, 0, ZoneOffset.UTC)
        );
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build();
    }
}
