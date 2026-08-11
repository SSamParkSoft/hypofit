package com.contentruck.hypofit.support.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.support.application.SupportTicketService;
import com.contentruck.hypofit.support.domain.SupportTicketReadModel;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class SupportTicketControllerTest {

    @Mock
    private SupportTicketService supportTicketService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void listTicketsUsesJwtSubjectAndKindFilter() {
        UUID userId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(supportTicketService.listTickets(userId, "inquiry")).thenReturn(List.of(ticket(userId)));

        SupportTicketController controller = new SupportTicketController(supportTicketService);
        List<SupportTicketResponse> response = controller.listTickets(jwt, "inquiry");

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().userId()).isEqualTo(userId);
    }

    @Test
    void createTicketNormalizesPayloadBeforeServiceCall() throws Exception {
        UUID userId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(supportTicketService.createTicket(eq(userId), argThat(command ->
                "문의 제목".equals(command.subject())
                        && "문의 내용을 길게 적었습니다.".equals(command.body())
                        && "user@example.com".equals(command.contactEmail())
                        && "mobile_feedback".equals(command.metadata().get("source"))
        ))).thenReturn(ticket(userId));

        SupportTicketController controller = new SupportTicketController(supportTicketService);
        SupportTicketResponse response = controller.createTicket(
                jwt,
                objectMapper.readValue("""
                        {
                          "kind": "inquiry",
                          "category": "other",
                          "subject": "  문의 제목  ",
                          "body": "  문의 내용을 길게 적었습니다.  ",
                          "contact_email": " USER@EXAMPLE.COM ",
                          "metadata": { "source": "mobile_feedback" }
                        }
                        """, SupportTicketCreateRequest.class)
        );

        assertThat(response.contactEmail()).isEqualTo("user@example.com");
    }

    @Test
    void createReportTicketPreservesTargetFields() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(supportTicketService.createTicket(eq(userId), argThat(command ->
                "report".equals(command.kind())
                        && "chat_room".equals(command.targetType())
                        && targetId.equals(command.targetId())
                        && "mobile_report".equals(command.metadata().get("source"))
        ))).thenReturn(ticket(userId));

        SupportTicketController controller = new SupportTicketController(supportTicketService);
        controller.createTicket(
                jwt,
                objectMapper.readValue("""
                        {
                          "kind": "report",
                          "category": "abuse",
                          "body": "채팅에서 부적절한 요구가 있었어요.",
                          "contact_email": " reporter@example.com ",
                          "target_type": "chat_room",
                          "target_id": "%s",
                          "metadata": { "source": "mobile_report" }
                        }
                        """.formatted(targetId), SupportTicketCreateRequest.class)
        );
    }

    @Test
    void updateTicketNormalizesFieldsBeforeServiceCall() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        Jwt jwt = jwt(userId);
        when(supportTicketService.updateTicket(eq(userId), eq(ticketId), argThat(command ->
                command.providedFields().equals(Set.of("subject", "body", "contact_email"))
                        && command.subject() == null
                        && "수정된 문의 내용입니다.".equals(command.body())
                        && "user@example.com".equals(command.contactEmail())
        ))).thenReturn(ticket(userId));

        SupportTicketController controller = new SupportTicketController(supportTicketService);
        SupportTicketResponse response = controller.updateTicket(
                ticketId,
                jwt,
                objectMapper.readValue("""
                        {
                          "subject": "   ",
                          "body": "  수정된 문의 내용입니다.  ",
                          "contact_email": " USER@EXAMPLE.COM "
                        }
                        """, SupportTicketUpdateRequest.class)
        );

        assertThat(response.body()).isEqualTo("로그인이 계속 실패합니다.");
    }

    @Test
    void deleteTicketUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        Jwt jwt = jwt(userId);

        SupportTicketController controller = new SupportTicketController(supportTicketService);
        controller.deleteTicket(ticketId, jwt);

        verify(supportTicketService).deleteTicket(userId, ticketId);
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .claim("email", "user@example.com")
                .build();
    }

    private SupportTicketReadModel ticket(UUID userId) {
        return new SupportTicketReadModel(
                UUID.randomUUID(),
                userId,
                "inquiry",
                "account",
                "로그인 문의",
                "로그인이 계속 실패합니다.",
                "user@example.com",
                null,
                null,
                "open",
                null,
                Map.of("source", "mobile_support"),
                OffsetDateTime.of(2026, 7, 31, 12, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 7, 31, 12, 5, 0, 0, ZoneOffset.UTC),
                List.of()
        );
    }
}
