package com.contentruck.hypofit.admin.application;

import com.contentruck.hypofit.notification.application.NotificationWriteService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminSupportService {

    private final AdminSupportRepository repository;
    private final NotificationWriteService notificationWriteService;

    public AdminSupportService(
            AdminSupportRepository repository,
            NotificationWriteService notificationWriteService
    ) {
        this.repository = repository;
        this.notificationWriteService = notificationWriteService;
    }

    @Transactional(readOnly = true)
    public List<AdminSupportTicketView> listTickets(String kind, String status, Boolean deletedByUser, int limit) {
        List<AdminSupportRepository.SupportTicketRecord> tickets = repository.listTickets(kind, status, deletedByUser, limit);
        Map<UUID, List<AdminSupportRepository.SupportTicketEventRecord>> eventsByTicketId = repository.listTicketEvents(
                tickets.stream().map(AdminSupportRepository.SupportTicketRecord::id).toList()
        );
        return tickets.stream()
                .map(ticket -> new AdminSupportTicketView(ticket, eventsByTicketId.getOrDefault(ticket.id(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminSupportTicketView getTicket(UUID ticketId) {
        AdminSupportRepository.SupportTicketRecord ticket = repository.findTicket(ticketId)
                .orElseThrow(AdminSupportTicketNotFoundException::new);
        Map<UUID, List<AdminSupportRepository.SupportTicketEventRecord>> eventsByTicketId = repository.listTicketEvents(List.of(ticketId));
        return new AdminSupportTicketView(ticket, eventsByTicketId.getOrDefault(ticketId, List.of()));
    }

    @Transactional
    public AdminSupportTicketView updateStatus(UUID actorUserId, UUID ticketId, AdminSupportStatusUpdateCommand command) {
        AdminSupportRepository.SupportTicketRecord ticket = repository.findTicket(ticketId)
                .orElseThrow(AdminSupportTicketNotFoundException::new);
        AdminSupportRepository.SupportTicketRecord updated = repository.updateStatus(
                ticketId,
                actorUserId,
                ticket.status(),
                command.status(),
                command.reason()
        );
        repository.recordAuditEvent(
                actorUserId,
                "operator",
                "support_ticket_status_changed",
                "support_ticket",
                ticketId,
                command.reason(),
                Map.of("status", command.status())
        );
        Map<UUID, List<AdminSupportRepository.SupportTicketEventRecord>> eventsByTicketId = repository.listTicketEvents(List.of(ticketId));
        return new AdminSupportTicketView(updated, eventsByTicketId.getOrDefault(ticketId, List.of()));
    }

    @Transactional
    public AdminSupportRepository.SupportTicketEventRecord addReply(
            UUID actorUserId,
            UUID ticketId,
            AdminSupportReplyCommand command
    ) {
        AdminSupportRepository.SupportTicketRecord ticket = repository.findTicket(ticketId)
                .orElseThrow(AdminSupportTicketNotFoundException::new);
        AdminSupportRepository.SupportTicketEventRecord event = repository.addReply(
                ticketId,
                actorUserId,
                command.body(),
                command.visibleToUser(),
                ticket.status()
        );
        repository.recordAuditEvent(
                actorUserId,
                "operator",
                "support_ticket_replied",
                "support_ticket",
                ticketId,
                null,
                Map.of(
                        "support_ticket_event_id", String.valueOf(event.id()),
                        "visible_to_user", command.visibleToUser()
                )
        );
        if (command.visibleToUser()) {
            notificationWriteService.createNotification(
                    ticket.userId(),
                    "support_replied",
                    "문의 답변이 도착했어요",
                    command.body() == null ? null : command.body().substring(0, Math.min(command.body().length(), 120)),
                    "support_ticket",
                    ticket.id(),
                    Map.of()
            );
        }
        return event;
    }

    public record AdminSupportStatusUpdateCommand(
            String status,
            String reason
    ) {
    }

    public record AdminSupportReplyCommand(
            String body,
            boolean visibleToUser
    ) {
    }

    public record AdminSupportTicketView(
            AdminSupportRepository.SupportTicketRecord ticket,
            List<AdminSupportRepository.SupportTicketEventRecord> events
    ) {
    }
}
