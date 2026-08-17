package com.contentruck.hypofit.support.service;

import com.contentruck.hypofit.user.service.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupportTicketService {

    private final SupportTicketRepository repository;

    public SupportTicketService(SupportTicketRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SupportTicketReadModel> listTickets(UUID userId, String kind) {
        requireActiveUser(userId);
        List<SupportTicketReadModel> tickets = repository.listTickets(userId, kind);
        Map<UUID, List<SupportTicketEventRecord>> eventsByTicketId = repository.listTicketEvents(
                tickets.stream().map(SupportTicketReadModel::id).toList()
        );
        return tickets.stream()
                .map(ticket -> ticket.withReplies(visibleReplies(eventsByTicketId.get(ticket.id()))))
                .toList();
    }

    @Transactional
    public SupportTicketReadModel createTicket(UUID userId, SupportTicketCreateCommand command) {
        requireActiveUser(userId);
        return repository.createTicket(userId, command);
    }

    @Transactional
    public SupportTicketReadModel updateTicket(UUID userId, UUID ticketId, SupportTicketUpdateCommand command) {
        requireActiveUser(userId);
        SupportTicketReadModel ticket = repository.findTicketForUser(ticketId, userId)
                .orElseThrow(SupportTicketNotFoundException::new);
        if (!"open".equals(ticket.status())) {
            throw new SupportTicketConflictException("Answered support tickets cannot be edited");
        }
        return repository.updateTicket(ticketId, userId, command);
    }

    @Transactional
    public void deleteTicket(UUID userId, UUID ticketId) {
        requireActiveUser(userId);
        SupportTicketReadModel ticket = repository.findTicketForUser(ticketId, userId)
                .orElseThrow(SupportTicketNotFoundException::new);
        if (!"open".equals(ticket.status())) {
            throw new SupportTicketConflictException("Answered support tickets cannot be deleted");
        }
        repository.deleteTicket(ticketId, userId);
    }

    private void requireActiveUser(UUID userId) {
        SupportActorAccount account = repository.findUserAccount(userId)
                .orElseThrow(UserProfileMissingException::new);
        if (account.deleted()) {
            throw new UserAccountDeletedException();
        }
        if (account.deactivated()) {
            throw new UserAccountDeactivatedException();
        }
    }

    private List<SupportTicketReplyReadModel> visibleReplies(List<SupportTicketEventRecord> events) {
        if (events == null || events.isEmpty()) {
            return List.of();
        }
        return events.stream()
                .filter(this::isVisibleOperatorReply)
                .map(event -> new SupportTicketReplyReadModel(
                        event.id(),
                        event.ticketId(),
                        event.message(),
                        event.createdAt()
                ))
                .toList();
    }

    private boolean isVisibleOperatorReply(SupportTicketEventRecord event) {
        return "operator_replied".equals(event.eventType())
                && "operator".equals(event.actorType())
                && event.message() != null
                && !event.message().trim().isEmpty()
                && Boolean.TRUE.equals(event.metadata().get("visible_to_user"));
    }
}
