package com.contentruck.hypofit.support.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SupportTicketServiceTest {

    @Mock
    private SupportTicketRepository repository;

    private SupportTicketService service;

    @BeforeEach
    void setUp() {
        service = new SupportTicketService(repository);
    }

    @Test
    void createTicketRequiresActiveUser() {
        UUID userId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.createTicket(userId, new SupportTicketCreateCommand(
                "inquiry",
                "account",
                null,
                "로그인이 안됩니다.",
                "user@example.com",
                null,
                null,
                Map.of()
        ))).thenReturn(ticket(UUID.randomUUID(), userId, "open"));

        SupportTicketReadModel result = service.createTicket(
                userId,
                new SupportTicketCreateCommand(
                        "inquiry",
                        "account",
                        null,
                        "로그인이 안됩니다.",
                        "user@example.com",
                        null,
                        null,
                        Map.of()
                )
        );

        assertThat(result.replies()).isEmpty();
        assertThat(result.status()).isEqualTo("open");
    }

    @Test
    void listTicketsIncludesOnlyVisibleOperatorReplies() {
        UUID userId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        UUID visibleReplyId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.listTickets(userId, "inquiry")).thenReturn(List.of(ticket(ticketId, userId, "resolved")));
        when(repository.listTicketEvents(List.of(ticketId))).thenReturn(Map.of(
                ticketId,
                List.of(
                        new SupportTicketEventRecord(
                                visibleReplyId,
                                ticketId,
                                UUID.randomUUID(),
                                "operator",
                                "operator_replied",
                                null,
                                "resolved",
                                "비밀번호 재설정 안내를 보내드렸어요.",
                                Map.of("visible_to_user", true),
                                OffsetDateTime.of(2026, 7, 31, 10, 0, 0, 0, ZoneOffset.UTC)
                        ),
                        new SupportTicketEventRecord(
                                UUID.randomUUID(),
                                ticketId,
                                UUID.randomUUID(),
                                "operator",
                                "operator_replied",
                                null,
                                "resolved",
                                "내부 메모",
                                Map.of("visible_to_user", false),
                                OffsetDateTime.of(2026, 7, 31, 10, 1, 0, 0, ZoneOffset.UTC)
                        )
                )
        ));

        List<SupportTicketReadModel> result = service.listTickets(userId, "inquiry");

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().replies()).hasSize(1);
        assertThat(result.getFirst().replies().getFirst().id()).isEqualTo(visibleReplyId);
    }

    @Test
    void updateTicketRejectsAnsweredTicket() {
        UUID userId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.findTicketForUser(ticketId, userId)).thenReturn(Optional.of(ticket(ticketId, userId, "resolved")));

        assertThatThrownBy(() -> service.updateTicket(
                userId,
                ticketId,
                new SupportTicketUpdateCommand(Set.of("body"), null, null, "수정 내용", null)
        )).isInstanceOf(SupportTicketConflictException.class)
                .hasMessageContaining("Answered support tickets cannot be edited");
    }

    @Test
    void updateTicketReturnsRepositoryResultForOpenTicket() {
        UUID userId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        SupportTicketUpdateCommand command = new SupportTicketUpdateCommand(
                Set.of("contact_email", "body"),
                null,
                null,
                "로그인이 계속 실패해서 다시 문의합니다.",
                "user@example.com"
        );
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.findTicketForUser(ticketId, userId)).thenReturn(Optional.of(ticket(ticketId, userId, "open")));
        when(repository.updateTicket(ticketId, userId, command)).thenReturn(ticket(ticketId, userId, "open"));

        SupportTicketReadModel result = service.updateTicket(userId, ticketId, command);

        assertThat(result.status()).isEqualTo("open");
        assertThat(result.replies()).isEmpty();
    }

    @Test
    void deleteTicketRejectsAnsweredTicket() {
        UUID userId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.findTicketForUser(ticketId, userId)).thenReturn(Optional.of(ticket(ticketId, userId, "resolved")));

        assertThatThrownBy(() -> service.deleteTicket(userId, ticketId))
                .isInstanceOf(SupportTicketConflictException.class)
                .hasMessageContaining("Answered support tickets cannot be deleted");
    }

    @Test
    void deleteTicketSoftDeletesOpenTicket() {
        UUID userId = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(activeUser(userId)));
        when(repository.findTicketForUser(ticketId, userId)).thenReturn(Optional.of(ticket(ticketId, userId, "open")));

        service.deleteTicket(userId, ticketId);

        verify(repository).deleteTicket(ticketId, userId);
    }

    private SupportActorAccount activeUser(UUID userId) {
        return new SupportActorAccount(userId, "user@example.com", false, false);
    }

    private SupportTicketReadModel ticket(UUID ticketId, UUID userId, String status) {
        return new SupportTicketReadModel(
                ticketId,
                userId,
                "inquiry",
                "account",
                "로그인 문의",
                "로그인이 계속 실패합니다.",
                "user@example.com",
                null,
                null,
                status,
                null,
                Map.of(),
                OffsetDateTime.of(2026, 7, 31, 9, 0, 0, 0, ZoneOffset.UTC),
                OffsetDateTime.of(2026, 7, 31, 9, 5, 0, 0, ZoneOffset.UTC),
                List.of()
        );
    }
}
